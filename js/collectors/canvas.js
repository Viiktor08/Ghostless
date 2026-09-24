import { sha256Hex } from '../hash.js';

const WIDTH = 300;
const HEIGHT = 80;

function newCanvas(width = WIDTH, height = HEIGHT) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Texto, emoji, mezcla de colores, degradados y sombras: cada GPU, driver y
// motor de fuentes lo rasteriza con diferencias mínimas pero constantes.
function draw(ctx) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f60';
  ctx.fillRect(150, 4, 70, 22);

  ctx.fillStyle = '#069';
  ctx.font = '16px "Times New Roman", serif';
  ctx.fillText('Ghostless ¿Qué sabe la web? 😃🕵️', 4, 22);

  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.font = '19px Arial, sans-serif';
  ctx.fillText('Cwm fjordbank glyphs vext quiz ✓ ñ', 6, 48);

  ctx.globalCompositeOperation = 'multiply';
  for (const [color, x, y] of [['#f2f', 200, 50], ['#2ff', 230, 50], ['#ff2', 215, 30]]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
  gradient.addColorStop(0, '#22d3ee');
  gradient.addColorStop(1, '#a855f7');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#22d3ee';
  ctx.beginPath();
  ctx.moveTo(0, 74);
  ctx.bezierCurveTo(80, 30, 210, 100, WIDTH, 60);
  ctx.stroke();
}

function render() {
  const canvas = newCanvas();
  draw(canvas.getContext('2d'));
  return canvas.toDataURL();
}

const PNG_SIGNATURE = '\x89PNG\r\n\x1a\n';

// Se queda solo con los fragmentos críticos del PNG (cabecera y píxeles).
// Algunos navegadores añaden fragmentos auxiliares con bytes que cambian en
// cada sesión (este Firefox mete uno llamado "deBG") aunque la imagen sea
// idéntica, y eso no debe cambiar la huella.
function pngPixels(dataURL) {
  const binary = atob(dataURL.slice(dataURL.indexOf(',') + 1));
  if (!binary.startsWith(PNG_SIGNATURE)) return { critical: dataURL, extra: [] };
  let critical = '';
  const extra = [];
  let i = PNG_SIGNATURE.length;
  while (i + 8 <= binary.length) {
    const length =
      ((binary.charCodeAt(i) << 24) | (binary.charCodeAt(i + 1) << 16) | (binary.charCodeAt(i + 2) << 8) | binary.charCodeAt(i + 3)) >>> 0;
    const end = i + 12 + length;
    const type = binary.slice(i + 4, i + 8);
    // Bit 5 del primer byte del tipo a 0 (mayúscula) = fragmento crítico.
    if ((binary.charCodeAt(i + 4) & 0x20) === 0) critical += binary.slice(i + 4, end);
    else extra.push(type);
    i = end;
  }
  return { critical, extra };
}

// Franjas opacas de colores conocidos: deben leerse exactamente igual. Si no,
// alguien está añadiendo ruido (Brave, Safari, Firefox con protección...).
const PROBE_SIZE = 32;
const STRIPES = [
  [10, 200, 50],
  [230, 40, 90],
  [30, 90, 240],
  [250, 250, 250],
];

function paintStripes(ctx) {
  const width = PROBE_SIZE / STRIPES.length;
  STRIPES.forEach(([r, g, b], i) => {
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(i * width, 0, width, PROBE_SIZE);
  });
}

function stripesIntact(ctx) {
  const { data } = ctx.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE);
  const width = PROBE_SIZE / STRIPES.length;
  for (let px = 0; px < PROBE_SIZE * PROBE_SIZE; px++) {
    const [r, g, b] = STRIPES[Math.floor((px % PROBE_SIZE) / width)];
    const o = px * 4;
    if (data[o] !== r || data[o + 1] !== g || data[o + 2] !== b || data[o + 3] !== 255) return false;
  }
  return true;
}

// Ruido al leer píxeles (getImageData), como hace Brave.
function hasPixelNoise() {
  const ctx = newCanvas(PROBE_SIZE, PROBE_SIZE).getContext('2d', { willReadFrequently: true });
  paintStripes(ctx);
  return !stripesIntact(ctx);
}

// Ruido solo al exportar (toDataURL), como hace Firefox: el ruido es igual en
// toda la sesión, así que dos pasadas coinciden. Se exporta, se decodifica de
// vuelta y se comprueba píxel a píxel (PNG no pierde nada).
async function hasExportNoise() {
  const source = newCanvas(PROBE_SIZE, PROBE_SIZE);
  paintStripes(source.getContext('2d'));
  const img = new Image();
  img.src = source.toDataURL();
  await img.decode();
  const ctx = newCanvas(PROBE_SIZE, PROBE_SIZE).getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return !stripesIntact(ctx);
}

export default [
  {
    id: 'canvas',
    category: 'render',
    name: 'Huella de canvas',
    async run() {
      const probe = newCanvas();
      if (!probe.getContext?.('2d') || typeof probe.toDataURL !== 'function') return { supported: false };

      // La primera pasada puede salir distinta mientras se cargan fuentes de sistema.
      render();
      const image = render();
      const first = pngPixels(image);
      const second = pngPixels(render());
      const blank = pngPixels(newCanvas().toDataURL());

      const empty = first.critical === blank.critical;
      const unstable = first.critical !== second.critical;
      const pixelNoise = hasPixelNoise();
      const exportNoise = await hasExportNoise();
      const hash = await sha256Hex(first.critical);

      let value = hash.slice(0, 16);
      if (empty) value = 'bloqueado: el navegador devuelve una imagen vacía';
      else if (unstable || pixelNoise || exportNoise) value += ' · con ruido añadido';

      return {
        supported: true,
        value,
        raw: hash,
        blocked: empty || unstable || pixelNoise || exportNoise,
        preview: image,
        details: {
          dosPasadasIguales: !unstable,
          ruidoAlLeerPixeles: pixelNoise,
          ruidoAlExportar: exportNoise,
          imagenVacia: empty,
          fragmentosPngIgnorados: first.extra,
        },
      };
    },
  },
];
