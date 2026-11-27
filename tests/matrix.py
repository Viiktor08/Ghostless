"""Matriz de pruebas de Ghostless (sección 11 del plan) automatizada con Playwright.

Cada caso reproduce una situación real: navegador normal e incógnito, Firefox
con resistFingerprinting, móviles, bloqueador de anuncios, sin JavaScript,
APIs rotas, la CSP y la navegación con teclado. Lo que no se puede instalar en
headless (Brave, uBlock) se simula inyectando el mismo comportamiento y se
marca como simulado.

Uso (desde la raíz del repo):
    python tests/matrix.py             # todos los casos
    python tests/matrix.py brave rfp   # solo los casos que contengan esos textos

Escribe el resultado en tests/output/matrix.md.
"""

from __future__ import annotations

import sys
import tempfile
import time
from dataclasses import dataclass, field

from playwright.sync_api import sync_playwright

from common import OUTPUT, Watch, by_id, csp_violations, scan, start_server


@dataclass
class Outcome:
    ok: bool
    details: list[str] = field(default_factory=list)


@dataclass
class Case:
    name: str
    engine: str
    run: callable
    simulated: bool = False


def readable(data: dict) -> int:
    return sum(1 for r in data["results"] if r["supported"] and not r["error"])


def scan_timed(page, base_url) -> tuple[dict, int]:
    start = time.perf_counter()
    data = scan(page, base_url)
    return data, round((time.perf_counter() - start) * 1000)


def clean_page(watch: Watch, page, details: list[str]) -> bool:
    problems = watch.problems + [f"violación de CSP: {v}" for v in csp_violations(page)]
    details.extend(problems)
    return not problems


# ---------------------------------------------------------------- casos ----


def chromium_normal(pw, base_url):
    profile = tempfile.mkdtemp(prefix="ghostless-perfil-")
    context = pw.chromium.launch_persistent_context(profile, reduced_motion="reduce")
    page = context.new_page()
    watch = Watch(page, base_url)
    first, ms = scan_timed(page, base_url)
    second = scan(page, base_url)
    details = [f"{readable(first)}/{len(first['results'])} señales", f"escaneo en {ms} ms"]
    stable = first["hash"] == second["hash"]
    details.append("hash estable al recargar" if stable else "el hash CAMBIA al recargar")
    ok = clean_page(watch, page, details) and stable and readable(first) >= 36
    context.close()
    chromium_normal.hash = first["hash"]
    chromium_normal.components = first["components"]
    return Outcome(ok, details)


def chromium_incognito(pw, base_url):
    browser = pw.chromium.launch()
    page = browser.new_context(reduced_motion="reduce").new_page()
    watch = Watch(page, base_url)
    data = scan(page, base_url)
    details = [f"{readable(data)}/{len(data['results'])} señales"]
    normal = getattr(chromium_normal, "hash", None)
    if normal:
        if data["hash"] == normal:
            details.append("mismo hash que en la ventana normal: el incógnito no te esconde")
        else:
            changed = [k for k in data["components"] if data["components"][k] != chromium_normal.components.get(k)]
            details.append(f"hash distinto; cambian: {', '.join(changed)}")
    ok = clean_page(watch, page, details)
    browser.close()
    return Outcome(ok, details)


def firefox_normal(pw, base_url):
    browser = pw.firefox.launch()
    page = browser.new_page()
    watch = Watch(page, base_url)
    data = scan(page, base_url)
    missing = [r["id"] for r in data["results"] if not r["supported"]]
    errors = [r["id"] for r in data["results"] if r["error"]]
    details = [f"{readable(data)}/{len(data['results'])} señales", f"no disponibles: {', '.join(missing) or 'ninguna'}"]
    if errors:
        details.append(f"con error: {', '.join(errors)}")
    ok = clean_page(watch, page, details) and not errors
    browser.close()
    return Outcome(ok, details)


def firefox_rfp(pw, base_url):
    browser = pw.firefox.launch(firefox_user_prefs={"privacy.resistFingerprinting": True})
    page = browser.new_page()
    watch = Watch(page, base_url)
    data = scan(page, base_url)
    findings = data["lies"]["findings"]
    protection = [f["title"] for f in findings if f["kind"] == "protection"]
    lies = [f["title"] for f in findings if f["kind"] == "inconsistency"]
    details = [f"veredicto: {data['lies']['verdict']}", f"protección: {'; '.join(protection) or 'ninguna'}"]
    if lies:
        details.append(f"incoherencias: {'; '.join(lies)}")
    ok = clean_page(watch, page, details) and bool(protection)
    browser.close()
    return Outcome(ok, details)


def webkit_safari(pw, base_url):
    browser = pw.webkit.launch()
    page = browser.new_page()
    watch = Watch(page, base_url)
    data = scan(page, base_url)
    missing = [r["id"] for r in data["results"] if not r["supported"]]
    masked = by_id(data)["webgl"].get("details", {}).get("masked")
    details = [
        f"{readable(data)}/{len(data['results'])} señales",
        f"no disponibles: {', '.join(missing) or 'ninguna'}",
        "GPU enmascarada detectada" if masked else "GPU sin enmascarar",
    ]
    ok = clean_page(watch, page, details) and not any(r["error"] for r in data["results"])
    browser.close()
    return Outcome(ok, details)


# Ruido fijo por sesión, como el "farbling" de Brave: dos pasadas coinciden,
# así que solo lo delatan las comprobaciones de integridad.
BRAVE_FARBLING = """
(() => {
  Object.defineProperty(Navigator.prototype, 'brave', { value: { isBrave: () => Promise.resolve(true) }, configurable: true });
  const farble = (data) => { for (let i = 0; i < data.length; i += 4 * 13) data[i] ^= 1; };
  const getImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (...args) {
    const image = getImageData.apply(this, args);
    farble(image.data);
    return image;
  };
  const toDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    const ctx = this.getContext('2d');
    if (ctx && this.width && this.height) {
      const image = getImageData.call(ctx, 0, 0, this.width, this.height);
      farble(image.data);
      ctx.putImageData(image, 0, 0);
    }
    return toDataURL.apply(this, args);
  };
  const getChannelData = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function (channel) {
    const data = getChannelData.call(this, channel);
    if (!this.__farbled) {
      this.__farbled = true;
      for (let i = 0; i < data.length; i++) data[i] *= 1.000001;
    }
    return data;
  };
})();
"""


def brave_simulated(pw, base_url):
    browser = pw.chromium.launch()
    page = browser.new_page()
    page.add_init_script(BRAVE_FARBLING)
    watch = Watch(page, base_url)
    data = scan(page, base_url)
    signals = by_id(data)
    canvas, audio = signals["canvas"], signals["audio"]
    brave = "Brave Shields" in (signals["antiFingerprinting"]["raw"] or [])
    details = [
        f"canvas: {'ruido detectado' if canvas['blocked'] else 'SIN detectar'} {canvas.get('details')}",
        f"audio: {'ruido detectado' if audio['blocked'] else 'SIN detectar'} {audio.get('details')}",
        "Brave identificado" if brave else "Brave SIN identificar",
    ]
    ok = clean_page(watch, page, details) and canvas["blocked"] and audio["blocked"] and brave
    browser.close()
    return Outcome(ok, details)


def mobile(device_name: str, engine: str):
    def run(pw, base_url):
        device = pw.devices[device_name]
        browser = getattr(pw, engine).launch()
        page = browser.new_context(**device, reduced_motion="reduce").new_page()
        watch = Watch(page, base_url)
        data, ms = scan_timed(page, base_url)
        width = page.evaluate("document.documentElement.scrollWidth")
        viewport = device["viewport"]["width"]
        touch = by_id(data)["touch"]["raw"]
        has_touch = touch["maxTouchPoints"] > 0 or touch["touchEvent"]
        false_alarm = any("sin pantalla táctil" in f["title"] for f in data["lies"]["findings"])
        lies = [f["title"] for f in data["lies"]["findings"] if f["kind"] == "inconsistency"]
        details = [
            f"{readable(data)}/{len(data['results'])} señales",
            f"escaneo en {ms} ms",
            f"táctil: {touch['maxTouchPoints']} puntos, eventos táctiles {'sí' if touch['touchEvent'] else 'no'}",
            "sin scroll horizontal" if width <= viewport else f"SCROLL HORIZONTAL: {width}px en {viewport}px",
        ]
        if lies:
            details.append(f"el detector ve la emulación: {'; '.join(lies)}")
        ok = clean_page(watch, page, details) and width <= viewport and has_touch and not false_alarm
        browser.close()
        return Outcome(ok, details)

    return run


# Los bloqueadores ocultan los anuncios con reglas CSS "cosméticas".
ADBLOCK_COSMETIC = """
new MutationObserver((mutations) => {
  for (const m of mutations) for (const node of m.addedNodes) {
    if (node.nodeType === 1 && node.matches('.adsbox, .ad-banner')) node.style.setProperty('display', 'none', 'important');
  }
}).observe(document, { childList: true, subtree: true });
"""


def adblock_simulated(pw, base_url):
    browser = pw.chromium.launch()
    page = browser.new_page()
    page.add_init_script(ADBLOCK_COSMETIC)
    watch = Watch(page, base_url)
    data = scan(page, base_url)
    detected = by_id(data)["adBlock"]["raw"] is True
    details = ["bloqueador detectado" if detected else "bloqueador SIN detectar"]
    ok = clean_page(watch, page, details) and detected
    browser.close()
    return Outcome(ok, details)


def no_javascript(pw, base_url):
    browser = pw.chromium.launch()
    page = browser.new_context(java_script_enabled=False).new_page()
    page.goto(base_url)
    message = page.locator(".noscript").is_visible()
    button = page.locator("#scan-btn").is_visible()
    details = [
        "aviso <noscript> visible" if message else "aviso <noscript> NO visible",
        "botón oculto" if not button else "el botón sigue visible (no haría nada)",
    ]
    browser.close()
    return Outcome(message and not button, details)


# Rompe APIs a propósito: excepciones, constructores que fallan y una promesa
# que nunca se resuelve (para probar el timeout del runner).
SABOTAGE = """
(() => {
  const fail = () => { throw new Error('saboteado por el test'); };
  HTMLCanvasElement.prototype.getContext = fail;
  window.OfflineAudioContext = function () { fail(); };
  window.webkitOfflineAudioContext = undefined;
  if (window.speechSynthesis) speechSynthesis.getVoices = fail;
  if (navigator.mediaDevices) navigator.mediaDevices.enumerateDevices = () => new Promise(() => {});
  window.RTCPeerConnection = function () { fail(); };
  Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: fail, configurable: true });
  Intl.DateTimeFormat.prototype.resolvedOptions = fail;
})();
"""


def sabotaged(pw, base_url):
    browser = pw.chromium.launch()
    page = browser.new_page()
    page.add_init_script(SABOTAGE)
    watch = Watch(page, base_url)
    data = scan(page, base_url)
    errors = {r["id"]: r["error"] for r in data["results"] if r["error"]}
    error_cards = page.locator(".card.risk-error").count()
    timeout = "timeout" in (errors.get("mediaDevices") or "")
    details = [
        f"{len(errors)} señales con error, la página sigue en pie",
        f"errores: {', '.join(errors)}",
        "enumerateDevices colgado → timeout del runner" if timeout else "el timeout NO saltó",
        f"{error_cards} tarjetas en estado de error",
    ]
    ok = not watch.errors and timeout and len(errors) >= 6 and error_cards == len(errors)
    browser.close()
    return Outcome(ok, details)


CSP_PROBE = """async () => {
  const out = {};
  try { await fetch('https://example.invalid/'); out.fetch = 'permitido'; } catch { out.fetch = 'bloqueado'; }
  try {
    const script = document.createElement('script');
    script.textContent = 'window.__pwned = true';
    document.body.append(script);
  } catch (e) { out.scriptTT = e.name; }
  const img = new Image();
  img.src = 'https://example.invalid/pixel.png';
  await new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 1000); });
  try { document.createElement('div').innerHTML = '<b>x</b>'; out.innerHTML = 'permitido'; }
  catch (e) { out.innerHTML = `bloqueado (${e.name})`; }
  await new Promise((r) => setTimeout(r, 100));
  out.inlineScript = window.__pwned ? 'EJECUTADO' : 'bloqueado';
  out.violations = window.__cspViolations;
  return out;
}"""


def csp_effective(engine: str):
    def run(pw, base_url):
        browser = getattr(pw, engine).launch()
        page = browser.new_page()
        page.add_init_script("window.__cspViolations = []; document.addEventListener('securitypolicyviolation', (e) => window.__cspViolations.push(e.effectiveDirective));")
        page.goto(base_url)
        out = page.evaluate(CSP_PROBE)
        violated = set(out["violations"])
        details = [
            f"fetch externo: {out['fetch']}",
            f"script inline: {out['inlineScript']}",
            f"innerHTML: {out['innerHTML']}",
            f"directivas que han saltado: {', '.join(sorted(violated))}",
        ]
        ok = out["fetch"] == "bloqueado" and out["inlineScript"] == "bloqueado" and {"connect-src", "img-src"} <= violated
        browser.close()
        return Outcome(ok, details)

    return run


def keyboard(engine: str):
    def run(pw, base_url):
        browser = getattr(pw, engine).launch()
        page = browser.new_page(reduced_motion="reduce")
        page.goto(base_url)
        active = lambda: page.evaluate("document.activeElement?.id || document.activeElement?.className || ''")  # noqa: E731
        details = []

        page.keyboard.press("Tab")
        skip = "skip-link" in active()
        details.append("1.er Tab → «Saltar al contenido»" if skip else f"1.er Tab → {active()}")

        def tab_until(selector: str, limit: int = 90) -> bool:
            for _ in range(limit):
                page.keyboard.press("Tab")
                if page.evaluate(f"document.activeElement?.matches({selector!r})"):
                    return True
            return False

        if not tab_until("#scan-btn", 10):
            return Outcome(False, details + ["no se llega al botón con Tab"])
        outline = page.evaluate("getComputedStyle(document.activeElement).outlineStyle")
        details.append(f"foco visible en el botón ({outline})" if outline != "none" else "el foco NO se ve")
        page.keyboard.press("Enter")
        page.wait_for_selector("html[data-scan='done']", state="attached", timeout=30_000)

        steps = []
        if tab_until("[data-open-how]"):
            page.keyboard.press("Enter")
            opened = page.locator("#how-dialog[open]").count() == 1
            page.keyboard.press("Escape")
            closed = page.locator("#how-dialog[open]").count() == 0
            steps.append("diálogo abre y cierra con Enter/Escape" if opened and closed else "el diálogo no responde al teclado")
        if tab_until(".card summary"):
            page.keyboard.press("Enter")
            expanded = page.evaluate("document.activeElement.parentElement.open")
            steps.append("tarjeta se despliega con Enter" if expanded else "la tarjeta NO se despliega")
        details.extend(steps)
        ok = skip and outline != "none" and len(steps) == 2 and all("NO" not in s and "no " not in s for s in steps)
        browser.close()
        return Outcome(ok, details)

    return run


CASES = [
    Case("Chrome normal", "chromium", chromium_normal),
    Case("Chrome incógnito", "chromium", chromium_incognito),
    Case("Firefox normal", "firefox", firefox_normal),
    Case("Firefox con resistFingerprinting", "firefox", firefox_rfp),
    Case("Safari (motor WebKit)", "webkit", webkit_safari),
    Case("Brave (farbling)", "chromium", brave_simulated, simulated=True),
    Case("Móvil iPhone", "webkit", mobile("iPhone 15", "webkit"), simulated=True),
    Case("Móvil Android", "chromium", mobile("Pixel 7", "chromium"), simulated=True),
    Case("Con bloqueador de anuncios", "chromium", adblock_simulated, simulated=True),
    Case("Sin JavaScript", "chromium", no_javascript),
    Case("APIs rotas y colgadas", "chromium", sabotaged),
    Case("CSP efectiva", "chromium", csp_effective("chromium")),
    Case("CSP efectiva", "firefox", csp_effective("firefox")),
    Case("CSP efectiva", "webkit", csp_effective("webkit")),
    Case("Navegación con teclado", "chromium", keyboard("chromium")),
    Case("Navegación con teclado", "firefox", keyboard("firefox")),
]


def main() -> int:
    filters = [f.lower() for f in sys.argv[1:]]
    cases = [c for c in CASES if not filters or any(f in f"{c.name} {c.engine}".lower() for f in filters)]
    server, base_url = start_server()
    rows = []
    try:
        with sync_playwright() as pw:
            for case in cases:
                try:
                    outcome = case.run(pw, base_url)
                except Exception as err:  # noqa: BLE001 - un caso roto no para la matriz
                    outcome = Outcome(False, [f"el test falló: {err}".splitlines()[0]])
                mark = "✅" if outcome.ok else "❌"
                label = f"{case.name}{' (simulado)' if case.simulated else ''}"
                print(f"{mark} {label} [{case.engine}]")
                for detail in outcome.details:
                    print(f"     · {detail}")
                rows.append((mark, label, case.engine, outcome.details))
    finally:
        server.shutdown()

    OUTPUT.mkdir(parents=True, exist_ok=True)
    lines = ["| | Caso | Motor | Detalle |", "|---|---|---|---|"]
    for mark, label, engine, details in rows:
        lines.append(f"| {mark} | {label} | {engine} | {'<br>'.join(d.replace('|', '/') for d in details)} |")
    (OUTPUT / "matrix.md").write_text("\n".join(lines) + "\n")
    failed = sum(1 for row in rows if row[0] == "❌")
    print(f"\n{len(rows) - failed}/{len(rows)} casos OK · tabla en tests/output/matrix.md")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
