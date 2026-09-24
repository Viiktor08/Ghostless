import { h } from './dom.js';
import { diffExports, downloadJSON, parseExport } from '../compare.js';

const STATUS = {
  different: { label: 'distinta', cls: 'is-bad' },
  same: { label: 'igual', cls: 'is-good' },
  'only-here': { label: 'solo aquí', cls: 'is-neutral' },
  'only-there': { label: 'solo allí', cls: 'is-neutral' },
  na: { label: 'ninguno', cls: 'is-neutral' },
};
const ORDER = ['different', 'same', 'only-here', 'only-there', 'na'];

const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'fecha desconocida' : dateFormat.format(date);
}

function verdict(diff) {
  if (diff.sameHash) return 'Mismo hash: para un tracker seríais exactamente el mismo navegador.';
  if (diff.comparable && diff.same / diff.comparable >= 0.4) {
    return `Hash distinto, pero ${diff.same} señales coinciden. Un tracker «cross-browser» podría unir las dos identidades usando solo lo que comparte tu equipo: pantalla, GPU, fuentes, zona horaria…`;
  }
  return 'Casi nada coincide: estas dos huellas parecen de equipos distintos.';
}

// Una sola columna de valores: "aquí" y "allí" apilados cuando difieren.
function values(row) {
  if (row.status === 'same' || row.status === 'only-here') return row.aqui ?? '—';
  if (row.status === 'only-there') return row.alli ?? '—';
  if (row.status === 'na') return '—';
  return [
    h('span', { class: 'value-line' }, h('span', { class: 'value-where' }, 'aquí '), row.aqui ?? '—'),
    h('span', { class: 'value-line' }, h('span', { class: 'value-where' }, 'allí '), row.alli ?? '—'),
  ];
}

function renderDiff(target, here, there) {
  const diff = diffExports(here, there);
  const rows = [...diff.rows].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  target.replaceChildren(
    h('p', { class: 'tool-status', 'data-compare-result': diff.sameHash ? 'same' : 'different' },
      `Comparando con ${there.navegador} · exportado el ${formatDate(there.fecha)}`,
    ),
    h('p', null, h('strong', null, `${diff.same} de ${diff.comparable}`), ' señales comparables son iguales. ', verdict(diff)),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'compare-table' },
        h('caption', { class: 'visually-hidden' }, 'Diferencias señal a señal'),
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, 'Señal'),
          h('th', { scope: 'col' }, 'Estado'),
          h('th', { scope: 'col' }, 'Valores'),
        )),
        h('tbody', null, rows.map((r) =>
          h('tr', { class: `row-${r.status}` },
            h('th', { scope: 'row' }, r.nombre),
            h('td', null, h('span', { class: `status-badge ${STATUS[r.status].cls}` }, STATUS[r.status].label)),
            h('td', null, values(r)),
          ),
        )),
      ),
    ),
  );
}

function slug(text) {
  return text.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function renderCompare(container, exportData) {
  const output = h('div', { class: 'compare-output', 'aria-live': 'polite' });
  const input = h('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden', 'data-compare-input': true });
  input.addEventListener('change', async () => {
    const [file] = input.files;
    input.value = '';
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('El archivo es demasiado grande para ser una huella.');
      renderDiff(output, exportData, parseExport(await file.text()));
    } catch (err) {
      output.replaceChildren(h('p', { class: 'tool-status is-bad' }, err.message));
    }
  });

  const filename = `ghostless-${slug(exportData.navegador)}-${exportData.fecha.slice(0, 10)}.json`;
  container.replaceChildren(
    h('p', null, '¿Qué te delata aunque cambies de navegador? Exporta tu huella aquí, abre esta página en otro navegador o equipo e importa el archivo para ver las diferencias señal a señal.'),
    h('div', { class: 'tool-actions' },
      h('button', { class: 'btn', type: 'button', 'data-compare-export': true, onclick: () => downloadJSON(exportData, filename) }, 'Exportar mi huella (.json)'),
      h('label', { class: 'btn file-btn' }, 'Importar otra huella', input),
    ),
    h('p', { class: 'note' }, 'El archivo incluye los valores legibles de tus señales (User-Agent, fuentes, GPU…). Compártelo solo con quien quieras. La comparación se hace aquí mismo, sin subir nada.'),
    output,
  );
}
