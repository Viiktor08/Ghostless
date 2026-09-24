import { formatBits, oneInPhrase } from './format.js';
import { WORLD_BITS } from '../scoring.js';

// Tarjeta PNG para compartir: solo lleva el hash, la puntuación y recuentos,
// nunca los datos crudos de las señales.

const W = 1200;
const H = 630;
const PAD = 64;
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = '"SF Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';
// Mismo fantasma que el favicon (viewBox 32×32).
const GHOST = 'M16 3C9.9 3 5 7.9 5 14v14l3.7-2.6L12.3 28l3.7-2.6 3.7 2.6 3.6-2.6L27 28V14C27 7.9 22.1 3 16 3Z';

const LEVEL_COLOR = { low: '--risk-low', mid: '--risk-mid', high: '--risk-high', extreme: '--risk-high' };

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
  return y + lineHeight;
}

function drawGhost(ctx, x, y, size, color, bg) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(GHOST));
  ctx.fillStyle = bg;
  for (const cx of [12, 20]) {
    ctx.beginPath();
    ctx.arc(cx, 14, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGauge(ctx, { cx, cy, r, bits, colors }) {
  const fraction = Math.min(1, bits / WORLD_BITS);
  ctx.lineCap = 'round';
  ctx.lineWidth = 30;
  ctx.strokeStyle = colors.border;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
  ctx.stroke();

  const gradient = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  gradient.addColorStop(0, colors.low);
  gradient.addColorStop(0.55, colors.mid);
  gradient.addColorStop(1, colors.high);
  ctx.strokeStyle = gradient;
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * Math.max(0.01, fraction));
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  ctx.fillStyle = colors.text;
  ctx.font = `800 104px ${MONO}`;
  ctx.fillText(formatBits(bits), cx, cy - 18);
  ctx.fillStyle = colors.dim;
  ctx.font = `26px ${MONO}`;
  ctx.fillText('bits de entropía', cx, cy + 26);
  ctx.textAlign = 'left';
}

function draw(ctx, data) {
  const colors = {
    bg: token('--bg'),
    border: token('--border'),
    text: token('--text'),
    dim: token('--text-dim'),
    faint: token('--text-faint'),
    accent: token('--accent'),
    low: token('--risk-low'),
    mid: token('--risk-mid'),
    high: token('--risk-high'),
    glow: token('--accent-glow'),
  };

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.78, 0, 0, W * 0.78, 0, 720);
  glow.addColorStop(0, 'rgba(34, 211, 238, 0.18)');
  glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  drawGhost(ctx, PAD, 52, 40, colors.accent, colors.bg);
  ctx.fillStyle = colors.text;
  ctx.font = `700 28px ${MONO}`;
  ctx.fillText('ghostless', PAD + 54, 82);

  ctx.fillStyle = colors.accent;
  ctx.font = `600 20px ${MONO}`;
  ctx.fillText('MI HUELLA DIGITAL', PAD, 160);
  ctx.fillStyle = colors.text;
  ctx.font = `800 54px ${SANS}`;
  ctx.fillText('¿Qué sabe la web de mí?', PAD, 222);

  ctx.fillStyle = token(LEVEL_COLOR[data.level.id]);
  ctx.font = `800 40px ${SANS}`;
  ctx.fillText(data.level.label, PAD, 296);
  ctx.fillStyle = colors.dim;
  ctx.font = `24px ${SANS}`;
  let y = wrapText(ctx, `${oneInPhrase(data.oneIn)} tendría mi misma combinación (estimación).`, PAD, 342, 620, 34);

  ctx.fillStyle = colors.faint;
  ctx.font = `20px ${MONO}`;
  ctx.fillText('SHA-256', PAD, y + 26);
  ctx.fillStyle = colors.accent;
  ctx.font = `24px ${MONO}`;
  ctx.fillText(data.hash.slice(0, 32), PAD, y + 62);
  ctx.fillText(data.hash.slice(32), PAD, y + 94);

  ctx.fillStyle = colors.dim;
  ctx.font = `22px ${SANS}`;
  ctx.fillText(`${data.readable} datos sin pedir permiso · ${data.requests} peticiones de red · ${data.browser}`, PAD, H - 64);

  drawGauge(ctx, { cx: 948, cy: 400, r: 170, bits: data.bits, colors });
  ctx.fillStyle = colors.faint;
  ctx.font = `18px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText('Estimación educativa · todo ocurrió en mi navegador', W - PAD, H - 64);
  ctx.textAlign = 'left';
}

export function createShareCard(data) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  draw(canvas.getContext('2d'), data);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))), 'image/png');
  });
}

// Conecta el diálogo: genera la tarjeta al abrirlo, descarga y comparte.
export function setupShareDialog(dialog, getData) {
  const preview = dialog.querySelector('[data-share-preview]');
  const download = dialog.querySelector('[data-share-download]');
  const shareButton = dialog.querySelector('[data-share-native]');
  const status = dialog.querySelector('[data-share-status]');
  let url = null;
  let file = null;

  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  shareButton.addEventListener('click', async () => {
    try {
      await navigator.share({ files: [file], title: 'Mi huella digital', text: '¿Qué sabe la web de ti? Mira la mía.' });
    } catch (err) {
      if (err.name !== 'AbortError') status.textContent = 'No se ha podido compartir. Descarga la imagen y compártela a mano.';
    }
  });

  return async function open() {
    status.textContent = '';
    dialog.showModal();
    const blob = await createShareCard(getData());
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    file = new File([blob], 'ghostless-huella.png', { type: 'image/png' });
    preview.src = url;
    download.href = url;
    shareButton.hidden = !navigator.canShare?.({ files: [file] });
  };
}
