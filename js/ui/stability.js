import { fill, h } from './dom.js';
import { clearStability, compareWithStored, loadStability, saveVisit, storageAvailable } from '../stability.js';

const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? String(iso) : dateFormat.format(date);
}

const INCOGNITO_TIP =
  'Prueba también en una ventana de incógnito: tiene su propio almacenamiento y no verá lo guardado, así que compara el hash a ojo o con el modo comparar.';

function clearButton(container, current, names) {
  return h('button', {
    class: 'btn btn-small',
    type: 'button',
    onclick: () => {
      clearStability();
      renderOptIn(container, current, names, 'Datos borrados. Aquí ya no queda nada guardado.');
    },
  }, 'Borrar mis datos guardados');
}

function renderOptIn(container, current, names, message) {
  const activate = () => {
    try {
      renderFirstSave(container, saveVisit(null, current), current, names);
    } catch {
      renderOptIn(container, current, names, 'No se ha podido guardar: tu navegador bloquea el almacenamiento local.');
    }
  };
  fill(
    container,
    message ? h('p', { class: 'tool-status' }, message) : null,
    h('p', null, '¿Cambia tu huella si recargas, si vuelves mañana o si actualizas el navegador? Para saberlo hay que recordar tu hash.'),
    h('p', { class: 'note' },
      'Si lo activas, guardaremos en el almacenamiento local de este navegador solo el hash, la fecha y una huella corta de cada señal. ',
      'Nunca sale de tu equipo y puedes borrarlo cuando quieras.',
    ),
    h('button', { class: 'btn', type: 'button', 'data-stability-activate': true, onclick: activate }, 'Activar el test de estabilidad'),
  );
}

function renderFirstSave(container, saved, current, names) {
  fill(
    container,
    h('p', { class: 'tool-status is-good' }, `Guardado el ${formatDate(saved.visits.at(-1).date)}.`),
    h('p', null, 'Ahora recarga la página y vuelve a escanear, o vuelve otro día: te diremos si tu huella ha cambiado y qué señales la han hecho cambiar.'),
    h('p', { class: 'note' }, INCOGNITO_TIP),
    clearButton(container, current, names),
  );
}

function renderComparison(container, comparison, saved, current, names) {
  const { same, last, changed, distinctHashes } = comparison;
  const changedNames = changed.map((id) => names[id] ?? id);
  const recent = saved.visits.slice(-5).reverse();

  fill(
    container,
    h('p', { class: `tool-status ${same ? 'is-good' : 'is-bad'}`, 'data-stability-result': same ? 'same' : 'changed' },
      same ? `Misma huella que en tu escaneo del ${formatDate(last.date)}.` : `Tu huella ha cambiado desde el ${formatDate(last.date)}.`,
    ),
    same
      ? h('p', null, 'Para un tracker seguirías siendo la misma persona, sin necesidad de cookies.')
      : h('p', null, `Han cambiado: ${changedNames.join(', ') || 'ninguna señal concreta (quizá cambió cuáles se podían leer)'}.`),
    same
      ? null
      : h('p', { class: 'note' },
          'Suele pasar al actualizar el navegador, instalar fuentes o cambiar de pantalla. Si cambia en cada visita, tu navegador está metiendo ruido (Brave, Firefox con protección): justo lo que quieres.',
        ),
    h('p', { class: 'note' }, `${saved.visits.length} escaneos guardados · ${distinctHashes === 1 ? '1 huella distinta' : `${distinctHashes} huellas distintas`}.`),
    h('ol', { class: 'visits' },
      recent.map((v) => h('li', null, h('span', null, formatDate(v.date)), h('code', null, `${v.hash.slice(0, 16)}…`))),
    ),
    h('p', { class: 'note' }, INCOGNITO_TIP),
    clearButton(container, current, names),
  );
}

// current = { hash, signals } con las huellas cortas de las señales estables.
export function renderStability(container, current, names) {
  if (!storageAvailable()) {
    fill(
    container,
      h('p', null, 'Tu navegador no deja usar el almacenamiento local, así que no podemos recordar tu huella entre visitas. Eso ya es una forma de protección.'),
    );
    return;
  }
  const stored = loadStability();
  if (!stored) {
    renderOptIn(container, current, names);
    return;
  }
  // Si ya lo activaste, cada escaneo se compara y se añade al historial.
  const comparison = compareWithStored(stored, current);
  let saved = stored;
  try {
    saved = saveVisit(stored, current);
  } catch {
    // Si no se puede guardar, al menos se muestra la comparación.
  }
  renderComparison(container, comparison, saved, current, names);
}
