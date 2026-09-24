"""Genera el GIF y las capturas del README en assets/readme/.

Usa Chromium en modo headless nuevo con la GPU real y sin la marca de
automatización, para que las capturas muestren lo que vería una persona y no
"navegador automatizado". El User-Agent y sus Client Hints se fijan a los de un
Chrome normal en este mismo Mac (el headless añade "HeadlessChrome").

Uso (desde la raíz del repo):
    ~/.venv/bin/python tools/readme_media.py
"""

from __future__ import annotations

import io
import platform
import sys
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tests"))
from common import start_server  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "assets" / "readme"
GIF_WIDTH = 880

LAUNCH = {"channel": "chromium", "args": ["--disable-blink-features=AutomationControlled", "--use-angle=metal", "--enable-gpu"]}


def chrome_identity(version: str) -> dict:
    major = version.split(".")[0]
    brands = [{"brand": "Google Chrome", "version": major}, {"brand": "Chromium", "version": major}, {"brand": "Not.A/Brand", "version": "99"}]
    return {
        "userAgent": f"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{major}.0.0.0 Safari/537.36",
        "platform": "MacIntel",
        "userAgentMetadata": {
            "brands": brands,
            "fullVersionList": [{**b, "version": version if b["brand"] != "Not.A/Brand" else "99.0.0.0"} for b in brands],
            "platform": "macOS",
            "platformVersion": platform.mac_ver()[0] or "15.0.0",
            "architecture": "arm" if platform.machine() == "arm64" else "x86",
            "bitness": "64",
            "model": "",
            "mobile": False,
            "wow64": False,
        },
    }


def new_page(browser, **options):
    page = browser.new_page(**options)
    page.context.new_cdp_session(page).send("Emulation.setUserAgentOverride", chrome_identity(browser.version))
    return page


# Colores de la interfaz que ocupan pocos píxeles (riesgo, acento, degradado
# del medidor): se añaden a la muestra de la paleta para que no se pierdan.
SWATCHES = ["#34d399", "#fbbf24", "#f87171", "#22d3ee", "#67e8f9", "#ff2bd6"]


def color_swatches(width: int, height: int) -> Image.Image:
    image = Image.new("RGB", (width, height))
    stops = [(0.0, (0x34, 0xD3, 0x99)), (0.55, (0xFB, 0xBF, 0x24)), (1.0, (0xF8, 0x71, 0x71))]
    for x in range(width):
        t = x / (width - 1)
        (t0, c0), (t1, c1) = next((a, b) for a, b in zip(stops, stops[1:]) if t <= b[0])
        k = (t - t0) / (t1 - t0)
        color = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
        for y in range(height // 2):
            image.putpixel((x, y), color)
    block = width // len(SWATCHES)
    for i, hex_color in enumerate(SWATCHES):
        image.paste(hex_color, (i * block, height // 2, (i + 1) * block, height))
    return image


def frame(page) -> Image.Image:
    return Image.open(io.BytesIO(page.screenshot(type="png"))).convert("RGB")


def record_scan_gif(browser, url: str):
    page = new_page(browser, viewport={"width": 1280, "height": 800})
    page.goto(url)
    page.wait_for_timeout(500)
    frames: list[tuple[Image.Image, int]] = [(frame(page), 1400)]

    page.click("#scan-btn")
    last = time.perf_counter()
    done_at = None
    # Escaneo y, al terminar, 2,5 s más para el medidor y el hash.
    while done_at is None or time.perf_counter() - done_at < 2.5:
        image = frame(page)
        now = time.perf_counter()
        frames.append((image, round((now - last) * 1000)))
        last = now
        if done_at is None and page.locator("html[data-scan='done']").count():
            done_at = now
    frames[-1] = (frames[-1][0], 3500)
    page.close()

    height = round(800 * GIF_WIDTH / 1280)
    images = [img.resize((GIF_WIDTH, height), Image.Resampling.LANCZOS) for img, _ in frames]
    # Paleta común sacada de la portada, el escaneo y el resultado, para que
    # el degradado del medidor no se pierda y no haya parpadeos de color.
    samples = [images[0], images[len(images) // 2], images[-1], color_swatches(GIF_WIDTH, height)]
    montage = Image.new("RGB", (GIF_WIDTH, height * len(samples)))
    for i, image in enumerate(samples):
        montage.paste(image, (0, i * height))
    palette = montage.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    paletted = [img.quantize(palette=palette, dither=Image.Dither.NONE) for img in images]
    durations = [max(60, d) for _, d in frames]
    out = MEDIA / "escaneo.gif"
    paletted[0].save(out, save_all=True, append_images=paletted[1:], duration=durations, loop=0, optimize=True, disposal=1)
    print(f"  {out.relative_to(ROOT)} · {len(frames)} fotogramas · {out.stat().st_size // 1024} KB")


def element_shots(browser, url: str):
    page = new_page(browser, viewport={"width": 1280, "height": 900}, device_scale_factor=2, reduced_motion="reduce", accept_downloads=True)
    page.goto(url)
    page.click("#scan-btn")
    page.wait_for_selector("html[data-scan='done']", state="attached")
    page.wait_for_timeout(500)

    def shot(selector: str, name: str):
        path = MEDIA / name
        page.locator(selector).screenshot(path=str(path))
        print(f"  {path.relative_to(ROOT)} · {path.stat().st_size // 1024} KB")

    shot(".summary", "resultado.png")
    shot("#lies", "detector.png")
    page.click("#signal-canvas summary")
    page.mouse.move(0, 0)
    shot("#cat-render", "tarjetas.png")
    shot("#protect", "protegerte.png")

    page.click("[data-share]")
    page.wait_for_selector("[data-share-preview][src^='blob:']")
    with page.expect_download() as download:
        page.click("[data-share-download]")
    download.value.save_as(MEDIA / "tarjeta-compartir.png")
    print(f"  {(MEDIA / 'tarjeta-compartir.png').relative_to(ROOT)}")
    page.close()

    mobile = new_page(browser, viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce")
    mobile.goto(url)
    mobile.click("#scan-btn")
    mobile.wait_for_selector("html[data-scan='done']", state="attached")
    mobile.wait_for_timeout(300)
    path = MEDIA / "movil.png"
    mobile.screenshot(path=str(path))
    print(f"  {path.relative_to(ROOT)}")
    mobile.close()


def main() -> int:
    MEDIA.mkdir(parents=True, exist_ok=True)
    server, url = start_server()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(**LAUNCH)
            record_scan_gif(browser, url)
            element_shots(browser, url)
            browser.close()
    finally:
        server.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
