import { h } from './dom.js';
import { statusOf } from './scan.js';
import { formatBits } from './format.js';
import { CATEGORIES } from '../collectors/categories.js';
import { EXPLANATIONS } from '../data/explanations.js';
import { riskFor } from '../scoring.js';

const RISK_LABEL = {
  high: 'riesgo alto',
  mid: 'riesgo medio',
  low: 'riesgo bajo',
  protected: 'protegido',
  na: 'no disponible',
  error: 'error',
};

function riskOf(result, bits) {
  const status = statusOf(result);
  if (status === 'na' || status === 'error') return status;
  if (status === 'blocked') return 'protected';
  return riskFor(bits);
}

function rawText(result) {
  const data = { valor: result.raw ?? result.value };
  if (result.details) data.detalles = result.details;
  const text = JSON.stringify(data, null, 2);
  return text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text;
}

function describeValue(result, risk) {
  if (risk === 'na') return 'Tu navegador no expone este dato.';
  if (risk === 'error') return `No se pudo leer: ${result.error}`;
  return String(result.value);
}

function explanation(title, text) {
  return text ? [h('h4', null, title), h('p', null, text)] : null;
}

function renderCard(result, bits, index) {
  const risk = riskOf(result, bits);
  const info = EXPLANATIONS[result.id] ?? {};
  const meta = [
    risk === 'na' ? null : `≈ ${formatBits(bits)} bits estimados`,
    result.stable ? 'estable: entra en tu hash' : 'volátil: no entra en el hash',
    `${result.ms} ms`,
  ].filter(Boolean);

  const card = h(
    'article',
    { class: `card risk-${risk}`, id: `signal-${result.id}` },
    h(
      'details',
      null,
      h(
        'summary',
        null,
        h('span', { class: 'card-head' }, h('span', { class: 'card-name' }, result.name), h('span', { class: 'risk-badge' }, RISK_LABEL[risk])),
        h('span', { class: 'card-value' }, describeValue(result, risk)),
        result.preview
          ? h('img', { class: 'card-preview', src: result.preview, alt: 'La imagen que tu navegador ha dibujado para la huella de canvas', width: 300, height: 80 })
          : null,
        h('span', { class: 'card-more', 'aria-hidden': 'true' }, 'más info'),
      ),
      h(
        'div',
        { class: 'card-body' },
        explanation('Qué es', info.what),
        explanation('Por qué importa', info.why),
        explanation('Cómo protegerte', info.protect),
        h('p', { class: 'card-meta' }, meta.join(' · ')),
        risk === 'na' ? null : h('details', { class: 'card-raw' }, h('summary', null, 'Ver datos en crudo'), h('pre', null, rawText(result))),
      ),
    ),
  );
  card.style.setProperty('--i', index);
  return card;
}

export function renderCategoryNav(nav, results) {
  const chips = CATEGORIES.filter((c) => results.some((r) => r.category === c.id)).map((c) =>
    h('a', { class: 'chip', href: `#cat-${c.id}` }, h('span', { 'aria-hidden': 'true' }, c.icon), ` ${c.label}`),
  );
  nav.replaceChildren(...chips);
}

export function renderCategories(container, results, score) {
  const sections = CATEGORIES.map((category) => {
    const items = results.filter((r) => r.category === category.id);
    if (!items.length) return null;
    const readable = items.filter((r) => r.supported && !r.error).length;
    const titleId = `cat-${category.id}-title`;
    return h(
      'section',
      { class: 'category', id: `cat-${category.id}`, 'aria-labelledby': titleId },
      h(
        'h3',
        { class: 'category-title', id: titleId },
        h('span', { class: 'category-icon', 'aria-hidden': 'true' }, category.icon),
        category.label,
        h('span', { class: 'category-count' }, `${readable}/${items.length} leídas`),
      ),
      h('div', { class: 'cards' }, items.map((r, i) => renderCard(r, score.perSignal[r.id], i))),
    );
  });
  container.replaceChildren(...sections.filter(Boolean));
}
