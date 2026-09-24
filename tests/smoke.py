"""Test de humo de Ghostless en navegadores reales (headless) con Playwright.

Comprueba lo que exige el plan: la página escanea sin romperse, no hay errores
en consola, no se hace ninguna petición fuera del propio sitio y el hash de la
huella es estable al recargar.

Uso (desde la raíz del repo):
    ~/.venv/bin/python tests/smoke.py                      # chromium, firefox y webkit
    ~/.venv/bin/python tests/smoke.py chromium -v          # un navegador, con valores
    ~/.venv/bin/python tests/smoke.py --screenshot         # guarda capturas en tests/output/
"""

from __future__ import annotations

import argparse
import functools
import json
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "tests" / "output"
BROWSERS = ("chromium", "firefox", "webkit")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):  # noqa: D401 - silencia el log de cada petición
        pass


def start_server() -> tuple[ThreadingHTTPServer, str]:
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}/"


def scan(page, base_url: str) -> dict:
    page.goto(base_url)
    page.click("#scan-btn")
    # Selector y no wait_for_function: la CSP de la página prohíbe eval.
    page.wait_for_selector("html[data-scan='done']", state="attached", timeout=30_000)
    return page.evaluate("JSON.parse(JSON.stringify(window.ghostless))")


def check_extras_first(page, name: str, fails: list[str]) -> Path:
    """Tras el primer escaneo: detector, estabilidad, tarjeta, exportar, terminal y pestañas."""
    if not page.locator("[data-lies] .verdict").count():
        fails.append("el detector de mentiras no muestra veredicto")

    page.click("[data-stability-activate]")
    if not page.locator("[data-stability] .tool-status.is-good").count():
        fails.append("el test de estabilidad no se activa")

    page.click("[data-share]")
    page.wait_for_selector("[data-share-preview][src^='blob:']", timeout=10_000)
    page.keyboard.press("Escape")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    with page.expect_download() as download:
        page.click("[data-compare-export]")
    exported = OUTPUT / f"{name}-export.json"
    download.value.save_as(exported)
    if json.loads(exported.read_text()).get("formato") != "ghostless-huella":
        fails.append("el JSON exportado no tiene el formato esperado")

    page.locator("#results-title").focus()
    page.keyboard.type("help")
    page.wait_for_selector("#egg-dialog[open]", timeout=5_000)
    for command in ("whoami", "neofetch", "cat canvas", "mentiras", "sudo rm -rf /"):
        page.fill("[data-egg-input]", command)
        page.press("[data-egg-input]", "Enter")
    output = page.inner_text("[data-egg-output]")
    for expected in ("Eres ", "Unicidad:", '"id": "canvas"', "Buen intento"):
        if expected not in output:
            fails.append(f"la terminal secreta no muestra «{expected}»")
    page.keyboard.press("Escape")

    selected = page.locator("[role=tab][aria-selected=true]")
    first_tab = selected.inner_text()
    selected.focus()
    page.keyboard.press("ArrowRight")
    if page.locator("[role=tab][aria-selected=true]").inner_text() == first_tab:
        fails.append("las pestañas de «Cómo protegerte» no responden a las flechas")
    return exported


def check_extras_second(page, exported: Path, fails: list[str]):
    """Tras recargar: la estabilidad recuerda la huella y la comparación coincide."""
    if not page.locator("[data-stability-result='same']").count():
        fails.append("el test de estabilidad no reconoce la misma huella tras recargar")
    page.set_input_files("[data-compare-input]", str(exported))
    page.wait_for_selector("[data-compare-result]", timeout=5_000)
    if page.get_attribute("[data-compare-result]", "data-compare-result") != "same":
        fails.append("el modo comparar no reconoce su propia exportación")


def short(value, width: int = 70) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    return text if len(text) <= width else text[: width - 1] + "…"


def diff_components(a: dict, b: dict) -> list[str]:
    keys = sorted(set(a) | set(b))
    return [k for k in keys if json.dumps(a.get(k), sort_keys=True) != json.dumps(b.get(k), sort_keys=True)]


def run_browser(pw, name: str, base_url: str, args) -> bool:
    browser = getattr(pw, name).launch()
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    problems: list[str] = []
    warnings: list[str] = []
    external: list[str] = []

    capturing = False

    def on_console(msg):
        # Playwright inyecta un <style> al hacer capturas en WebKit y nuestra CSP
        # lo bloquea: es ruido del test, no un error de la página.
        if capturing and "Content Security Policy" in msg.text:
            return
        if msg.type == "error":
            problems.append(f"consola: {msg.text}")
        elif msg.type == "warning":
            warnings.append(f"consola: {msg.text}")

    def on_request(request):
        url = request.url
        if not (url.startswith(base_url) or url.startswith(("data:", "blob:"))):
            external.append(url)

    def on_response(response):
        if response.status >= 400:
            problems.append(f"HTTP {response.status}: {response.url}")

    page.on("console", on_console)
    page.on("pageerror", lambda err: problems.append(f"excepción: {err}"))
    page.on("request", on_request)
    page.on("response", on_response)

    def screenshot(filename: str):
        nonlocal capturing
        OUTPUT.mkdir(parents=True, exist_ok=True)
        capturing = True
        page.screenshot(path=str(OUTPUT / filename), full_page=True)
        page.wait_for_timeout(200)
        capturing = False

    extras_fails: list[str] = []
    first = scan(page, base_url)
    if args.screenshot:
        page.wait_for_timeout(2000)  # deja terminar el medidor y la entrada de las tarjetas
        screenshot(f"{name}.png")
    exported = check_extras_first(page, name, extras_fails)
    # Segunda pasada con movimiento reducido: prueba ese camino y que el hash no cambia.
    page.emulate_media(reduced_motion="reduce")
    second = scan(page, base_url)
    check_extras_second(page, exported, extras_fails)
    if args.screenshot:
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(300)
        screenshot(f"{name}-movil.png")
        width = page.evaluate("document.documentElement.scrollWidth")
        if width > 390:
            problems.append(f"scroll horizontal en móvil: {width}px de ancho")
    browser.close()

    results = first["results"]
    supported = [r for r in results if r["supported"] and not r["error"]]
    errored = [r for r in results if r["error"]]
    blocked = [r for r in results if r["blocked"]]

    print(f"\n=== {name} ===")
    print(f"señales: {len(supported)}/{len(results)} leídas · hash {first['hash'][:16]}…")
    for r in results:
        if r["error"]:
            mark = "ERR"
        elif not r["supported"]:
            mark = " - "
        elif r["blocked"]:
            mark = "BLK"
        else:
            mark = " ok"
        line = f"  [{mark}] {r['id']:<22} {r['ms']:>5} ms"
        if args.verbose or r["error"]:
            line += f"  {short(r['error'] or r['value'])}"
        print(line)

    problems.extend(f"extras: {f}" for f in extras_fails)
    if not extras_fails:
        print("  extras: detector, estabilidad, comparar, tarjeta, terminal y pestañas OK")
    lies = first.get("lies", {})
    print(f"  detector: {lies.get('verdict')} · " + "; ".join(f["title"] for f in lies.get("findings", [])))
    if first.get("requests"):
        problems.append(f"la página contó {first['requests']} peticiones de red durante el escaneo")
    if first["hash"] != second["hash"]:
        changed = diff_components(first["components"], second["components"])
        problems.append(f"hash inestable al recargar; cambian: {', '.join(changed)}")
    for r in errored:
        warnings.append(f"collector {r['id']}: {r['error']}")
    for r in blocked:
        warnings.append(f"collector {r['id']} parece bloqueado/falseado")
    problems.extend(f"petición externa: {url}" for url in external)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / f"{name}.json").write_text(json.dumps(first, ensure_ascii=False, indent=2))

    for w in warnings:
        print(f"  aviso: {w}")
    for p in problems:
        print(f"  FALLO: {p}")
    print("  => OK" if not problems else "  => FALLA")
    return not problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("browsers", nargs="*", help=f"por defecto: {' '.join(BROWSERS)}")
    parser.add_argument("-v", "--verbose", action="store_true", help="muestra el valor de cada señal")
    parser.add_argument("--screenshot", action="store_true", help="guarda capturas en tests/output/")
    args = parser.parse_args()
    unknown = set(args.browsers) - set(BROWSERS)
    if unknown:
        parser.error(f"navegador desconocido: {', '.join(sorted(unknown))}")

    server, base_url = start_server()
    try:
        with sync_playwright() as pw:
            ok = [run_browser(pw, name, base_url, args) for name in (args.browsers or BROWSERS)]
    finally:
        server.shutdown()
    return 0 if all(ok) else 1


if __name__ == "__main__":
    sys.exit(main())
