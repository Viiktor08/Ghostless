import { h } from './dom.js';

const KIND_LABEL = {
  inconsistency: 'incoherencia',
  protection: 'protección',
  automation: 'automatización',
  info: 'curiosidad',
};

// Primero lo más grave.
const ORDER = { inconsistency: 0, automation: 1, protection: 2, info: 3 };
const SEVERITY = { high: 0, mid: 1, low: 2 };

export function renderLies(container, { ua, findings, verdict, checks }) {
  const sorted = [...findings].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || SEVERITY[a.severity] - SEVERITY[b.severity]);
  const identity = [ua.browser, ua.major].filter(Boolean).join(' ') || 'un navegador desconocido';

  container.replaceChildren(
    h('div', { class: `verdict verdict-${verdict.id}` },
      h('p', { class: 'verdict-title' }, verdict.title),
      h('p', { class: 'verdict-text' }, verdict.text),
    ),
    h('p', { class: 'lies-intro' },
      `Tu User-Agent dice que eres ${identity} en ${ua.os ?? 'un sistema desconocido'}. `,
      `Lo hemos contrastado con el resto de señales en ${checks} comprobaciones.`,
    ),
    sorted.length
      ? h('ul', { class: 'findings' },
          sorted.map((f) =>
            h('li', { class: `finding kind-${f.kind} sev-${f.severity}` },
              h('span', { class: 'finding-tag' }, KIND_LABEL[f.kind]),
              h('span', { class: 'finding-text' },
                h('strong', { class: 'finding-title' }, f.title),
                h('span', { class: 'finding-detail' }, f.detail),
              ),
            ),
          ),
        )
      : h('p', { class: 'findings-empty' }, 'Ninguna incoherencia ni protección a la vista.'),
  );
}
