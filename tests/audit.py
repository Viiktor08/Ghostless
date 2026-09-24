"""Auditoría de calidad: Lighthouse sobre la carga inicial y axe-core sobre la
interfaz ya escaneada (Lighthouse no pulsa el botón, así que no ve resultados).

Requisitos: Node (para `npx`) y las dependencias de requirements.txt.

Uso (desde la raíz del repo):
    ~/.venv/bin/python tests/audit.py               # Lighthouse móvil y escritorio + axe en los 3 motores
    ~/.venv/bin/python tests/audit.py --skip-lighthouse

Los informes quedan en tests/output/ (lighthouse-*.report.html y .json).
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys

from axe_playwright_python.sync_playwright import Axe
from playwright.sync_api import sync_playwright

from common import BROWSERS, OUTPUT, scan, start_server

LIGHTHOUSE = "lighthouse@13.5.0"
CATEGORIES = ("performance", "accessibility", "best-practices", "seo")
# Umbrales del plan (sección 11). Rendimiento y SEO se informan, no bloquean.
REQUIRED = {"accessibility": 90, "best-practices": 90}


def run_lighthouse(url: str, chrome_path: str, preset: str) -> tuple[dict, list[str]]:
    base = OUTPUT / f"lighthouse-{preset}"
    cmd = [
        "npx", "--yes", LIGHTHOUSE, url,
        "--quiet",
        "--chrome-flags=--headless=new --no-first-run --no-default-browser-check",
        f"--only-categories={','.join(CATEGORIES)}",
        "--output=json", "--output=html", f"--output-path={base}",
    ]
    if preset == "desktop":
        cmd.append("--preset=desktop")
    subprocess.run(cmd, check=True, env={**os.environ, "CHROME_PATH": chrome_path}, capture_output=True, text=True)
    report = json.loads(base.with_name(f"{base.name}.report.json").read_text())

    scores = {c: round(report["categories"][c]["score"] * 100) for c in CATEGORIES}
    failing = []
    for category in CATEGORIES:
        for ref in report["categories"][category]["auditRefs"]:
            audit = report["audits"][ref["id"]]
            if ref["weight"] > 0 and audit["score"] is not None and audit["score"] < 0.9:
                failing.append(f"{category}: {audit['title']} ({audit.get('displayValue') or round(audit['score'] * 100)})")
    return scores, failing


def run_axe(pw, engine: str, url: str) -> tuple[list[str], str]:
    browser = getattr(pw, engine).launch()
    note = ""
    # axe inserta nodos con innerHTML, que nuestros Trusted Types bloquean: si
    # pasa, se audita con la CSP desactivada (la accesibilidad no depende de ella).
    for bypass in (False, True):
        page = browser.new_context(reduced_motion="reduce", bypass_csp=bypass).new_page()
        scan(page, url)
        page.click(".card summary")  # una tarjeta desplegada
        try:
            response = Axe().run(page).response
            note = " (con la CSP desactivada para inyectar axe)" if bypass else ""
            break
        except Exception as err:  # noqa: BLE001
            if bypass or "Trusted" not in str(err):
                raise
    browser.close()
    violations = [
        f"[{v['impact']}] {v['id']}: {v['help']} → {len(v['nodes'])} nodo(s), p. ej. {v['nodes'][0]['target']}"
        for v in response["violations"]
    ]
    return violations, note


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--skip-lighthouse", action="store_true")
    args = parser.parse_args()

    OUTPUT.mkdir(parents=True, exist_ok=True)
    server, url = start_server()
    ok = True
    try:
        with sync_playwright() as pw:
            if not args.skip_lighthouse:
                for preset in ("mobile", "desktop"):
                    scores, failing = run_lighthouse(url, pw.chromium.executable_path, preset)
                    print(f"\n=== Lighthouse · {preset} ===")
                    print("  " + " · ".join(f"{c}: {s}" for c, s in scores.items()))
                    for item in failing:
                        print(f"  a mejorar: {item}")
                    for category, minimum in REQUIRED.items():
                        if scores[category] < minimum:
                            ok = False
                            print(f"  FALLO: {category} {scores[category]} < {minimum}")

            for engine in BROWSERS:
                violations, note = run_axe(pw, engine, url)
                print(f"\n=== axe-core · {engine} · interfaz con resultados{note} ===")
                print(f"  {len(violations)} problemas de accesibilidad")
                for v in violations:
                    print(f"  {v}")
                ok = ok and not violations
    finally:
        server.shutdown()
    print("\n=> OK" if ok else "\n=> FALLA")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
