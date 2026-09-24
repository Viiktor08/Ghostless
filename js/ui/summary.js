import { h } from './dom.js';
import { decrypt } from './effects.js';
import { formatBits, formatOneIn } from './format.js';
import { DECAY, WORLD_BITS } from '../scoring.js';

const HASH_GROUP = 16;

function hashGroups(hash) {
  const groups = [];
  for (let i = 0; i < hash.length; i += HASH_GROUP) groups.push(hash.slice(i, i + HASH_GROUP));
  return groups;
}

async function copyText(text, fallbackNode) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Sin permiso de portapapeles (o contexto no seguro): se deja seleccionado.
    const range = document.createRange();
    range.selectNodeContents(fallbackNode);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return false;
  }
}

export function renderScore(root, score) {
  const level = root.querySelector('[data-level]');
  level.textContent = score.level.label;
  level.className = `level level-${score.level.id}`;
  root.querySelector('[data-level-text]').textContent = score.level.text;
  root.querySelector('[data-one-in]').textContent = formatOneIn(score.oneIn);
}

export function renderHash(root, hash, stableCount) {
  const hashEl = root.querySelector('[data-hash]');
  const spans = hashGroups(hash).map(() => h('span'));
  hashEl.replaceChildren(...spans);
  hashGroups(hash).forEach((group, i) => decrypt(spans[i], group, 600 + i * 150));
  hashEl.setAttribute('aria-label', `Hash de tu huella: ${hash}`);
  root.querySelector('[data-stable-count]').textContent = String(stableCount);

  const copyButton = root.querySelector('[data-copy]');
  const status = root.querySelector('[data-copy-status]');
  copyButton.onclick = async () => {
    const copied = await copyText(hash, hashEl);
    status.textContent = copied ? '¡Copiado!' : 'Seleccionado: cópialo con Ctrl+C / ⌘C';
    setTimeout(() => {
      status.textContent = '';
    }, 2500);
  };
}

export function renderStats(root, { readable, total, protectedCount, requests }) {
  root.querySelector('[data-stat-readable]').textContent = String(readable);
  root.querySelector('[data-stat-total]').textContent = String(total);
  root.querySelector('[data-stat-protected]').textContent = String(protectedCount);
  root.querySelector('[data-stat-requests]').textContent = String(requests);
}

// Tabla del diálogo "¿Cómo se calcula esto?": qué aporta cada señal.
export function renderBreakdown(root, score, results) {
  const names = Object.fromEntries(results.map((r) => [r.id, r.name]));
  root.querySelector('[data-naive-bits]').textContent = formatBits(score.naive);
  root.querySelector('[data-final-bits]').textContent = formatBits(score.bits);
  root.querySelector('[data-world-bits]').textContent = formatBits(WORLD_BITS);
  root.querySelector('[data-decay]').textContent = String(DECAY).replace('.', ',');
  root.querySelector('[data-breakdown]').replaceChildren(
    ...score.ranked.map((r, i) =>
      h(
        'tr',
        null,
        h('td', { class: 'num' }, String(i + 1)),
        h('td', null, names[r.id] ?? r.id),
        h('td', { class: 'num' }, formatBits(r.bits)),
        h('td', { class: 'num' }, `×${r.weight.toFixed(2).replace('.', ',')}`),
        h('td', { class: 'num' }, formatBits(r.contribution)),
      ),
    ),
  );
}
