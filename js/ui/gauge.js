import { h, svg } from './dom.js';
import { countUp } from './effects.js';
import { formatBits } from './format.js';
import { WORLD_BITS } from '../scoring.js';

// Semicírculo de radio 80 centrado en (100, 100).
const ARC = 'M 20 100 A 80 80 0 0 1 180 100';
const TICKS = [0, 11, 22, 33];

function tickAt(bits) {
  const angle = Math.PI * (1 - bits / WORLD_BITS);
  const point = (r) => [100 + r * Math.cos(angle), 100 - r * Math.sin(angle)];
  const [x1, y1] = point(90);
  const [x2, y2] = point(96);
  const [lx, ly] = point(106);
  return [
    svg('line', { class: 'gauge-tick', x1, y1, x2, y2 }),
    svg('text', { class: 'gauge-label', x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, String(bits)),
  ];
}

export function renderGauge(container, score) {
  const value = svg('path', { class: 'gauge-value', d: ARC, pathLength: 100, 'stroke-dasharray': '0 100' });
  const graphic = svg(
    'svg',
    { class: 'gauge-svg', viewBox: '-8 -12 216 124', 'aria-hidden': 'true' },
    svg(
      'defs',
      null,
      svg(
        'linearGradient',
        { id: 'gauge-gradient', x1: 0, x2: 1, y1: 0, y2: 0 },
        svg('stop', { offset: '0%', class: 'stop-low' }),
        svg('stop', { offset: '55%', class: 'stop-mid' }),
        svg('stop', { offset: '100%', class: 'stop-high' }),
      ),
    ),
    svg('path', { class: 'gauge-track', d: ARC, pathLength: 100 }),
    value,
    TICKS.map(tickAt),
  );

  const number = h('span', { class: 'gauge-number' }, formatBits(0));
  const label = `Unicidad estimada: ${formatBits(score.bits)} bits de unos ${Math.round(WORLD_BITS)} posibles`;
  container.replaceChildren(
    h('div', { class: 'gauge', role: 'img', 'aria-label': label },
      graphic,
      h('div', { class: 'gauge-readout', 'aria-hidden': 'true' }, number, h('span', { class: 'gauge-unit' }, 'bits de entropía')),
    ),
  );

  return countUp(score.bits, (bits) => {
    number.textContent = formatBits(bits);
    value.setAttribute('stroke-dasharray', `${Math.min(100, (bits / WORLD_BITS) * 100)} 100`);
  });
}
