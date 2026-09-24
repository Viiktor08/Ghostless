"""Utilidades compartidas por los tests: servidor local, escaneo y vigilancia."""

from __future__ import annotations

import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "tests" / "output"
BROWSERS = ("chromium", "firefox", "webkit")

# Se inyecta antes que los scripts de la página y apunta cada violación de la CSP.
CSP_WATCH = """
window.__cspViolations = [];
document.addEventListener('securitypolicyviolation', (e) => {
  window.__cspViolations.push(`${e.effectiveDirective} ← ${e.blockedURI || 'inline'}`);
});
"""


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):  # noqa: D401 - silencia el log de cada petición
        pass


def start_server() -> tuple[ThreadingHTTPServer, str]:
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}/"


def scan(page, base_url: str, timeout: int = 30_000) -> dict:
    page.goto(base_url)
    page.click("#scan-btn")
    # Selector y no wait_for_function: la CSP de la página prohíbe eval.
    page.wait_for_selector("html[data-scan='done']", state="attached", timeout=timeout)
    return page.evaluate("JSON.parse(JSON.stringify(window.ghostless))")


def csp_violations(page) -> list[str]:
    return page.evaluate("window.__cspViolations ?? []")


def by_id(data: dict) -> dict:
    return {r["id"]: r for r in data["results"]}


def short(value, width: int = 70) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    return text if len(text) <= width else text[: width - 1] + "…"


class Watch:
    """Vigila consola, excepciones, peticiones fuera del sitio y errores HTTP."""

    def __init__(self, page, base_url: str):
        self.page = page
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.external: list[str] = []
        self.capturing = False
        page.add_init_script(CSP_WATCH)
        page.on("console", self._on_console)
        page.on("pageerror", lambda err: self.errors.append(f"excepción: {err}"))
        page.on("request", lambda req: self._on_request(req, base_url))
        page.on("response", lambda res: res.status >= 400 and self.errors.append(f"HTTP {res.status}: {res.url}"))

    def _on_console(self, msg):
        # Playwright inyecta un <style> al hacer capturas en WebKit y nuestra CSP
        # lo bloquea: es ruido del test, no un error de la página.
        if self.capturing and "Content Security Policy" in msg.text:
            return
        if msg.type == "error":
            self.errors.append(f"consola: {msg.text}")
        elif msg.type == "warning":
            self.warnings.append(f"consola: {msg.text}")

    def _on_request(self, request, base_url: str):
        if not request.url.startswith((base_url, "data:", "blob:")):
            self.external.append(request.url)

    def screenshot(self, filename: str, **kwargs):
        OUTPUT.mkdir(parents=True, exist_ok=True)
        self.capturing = True
        self.page.screenshot(path=str(OUTPUT / filename), **kwargs)
        self.page.wait_for_timeout(200)
        self.capturing = False

    @property
    def problems(self) -> list[str]:
        return self.errors + [f"petición externa: {url}" for url in self.external]
