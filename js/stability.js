// Test de estabilidad: guarda (solo si el usuario lo activa) el hash de cada
// escaneo y la huella corta de cada señal estable, para ver qué cambia entre
// visitas. Todo queda en el localStorage de este navegador.

const KEY = 'ghostless:estabilidad';
const MAX_VISITS = 20;

function store() {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export const storageAvailable = () => store() !== null;

export function loadStability() {
  try {
    const data = JSON.parse(store()?.getItem(KEY) ?? 'null');
    return data && Array.isArray(data.visits) && data.signals ? data : null;
  } catch {
    return null;
  }
}

export function saveVisit(previous, { hash, signals }) {
  const visits = [...(previous?.visits ?? []), { date: new Date().toISOString(), hash }].slice(-MAX_VISITS);
  const data = { version: 1, visits, signals };
  store().setItem(KEY, JSON.stringify(data));
  return data;
}

export function clearStability() {
  try {
    store()?.removeItem(KEY);
  } catch {
    // Nada que borrar.
  }
}

// Compara el escaneo actual con el último guardado.
export function compareWithStored(stored, { hash, signals }) {
  const last = stored.visits.at(-1);
  const ids = new Set([...Object.keys(stored.signals), ...Object.keys(signals)]);
  const changed = [...ids].filter((id) => stored.signals[id] !== signals[id]);
  return {
    same: last.hash === hash,
    last,
    changed,
    distinctHashes: new Set([...stored.visits.map((v) => v.hash), hash]).size,
  };
}
