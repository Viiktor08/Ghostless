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

    def on_console(msg):
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

    first = scan(page, base_url)
    if args.screenshot:
        OUTPUT.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(OUTPUT / f"{name}.png"), full_page=True)
    second = scan(page, base_url)
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
