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

// Un bloque de color sólido debe leerse exactamente igual; si no, alguien
// está añadiendo ruido a los píxeles (Brave, Safari, Firefox con protección...).
function hasPixelNoise() {
  const canvas = newCanvas(16, 16);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = 'rgb(10, 200, 50)';
  ctx.fillRect(0, 0, 16, 16);
  const { data } = ctx.getImageData(0, 0, 16, 16);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] !== 10 || data[i + 1] !== 200 || data[i + 2] !== 50 || data[i + 3] !== 255) return true;
  }
  return false;
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
      const first = render();
      const second = render();
      const blank = newCanvas().toDataURL();

      const empty = first === blank;
      const unstable = first !== second;
      const pixelNoise = hasPixelNoise();
      const hash = await sha256Hex(first);

      let value = hash.slice(0, 16);
      if (empty) value = 'bloqueado: el navegador devuelve una imagen vacía';
      else if (unstable || pixelNoise) value += ' · con ruido añadido';

      return {
        supported: true,
        value,
        raw: hash,
        blocked: empty || unstable || pixelNoise,
        preview: first,
        details: { dosPasadasIguales: !unstable, ruidoEnPixeles: pixelNoise, imagenVacia: empty },
      };
    },
  },
];
