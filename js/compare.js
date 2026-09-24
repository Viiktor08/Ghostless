// Modo comparar: exporta la huella de este navegador a un JSON y compara con
// la de otro navegador (o equipo) señal a señal.

export const EXPORT_FORMAT = 'ghostless-huella';
const MAX_SIGNALS = 200;
const MAX_VALUE = 300;

const text = (value, max) => (value == null ? null : String(value).slice(0, max));

export function buildExport({ results, hash, fingerprints, ua }) {
  const browser = [ua.browser, ua.major].filter(Boolean).join(' ') || 'Navegador desconocido';
  return {
    formato: EXPORT_FORMAT,
    version: 1,
    fecha: new Date().toISOString(),
    navegador: `${browser} · ${ua.os ?? 'sistema desconocido'}`,
    hash,
    senales: results.map((r) => {
      const readable = r.supported && !r.error;
      return {
        id: r.id,
        nombre: r.name,
        estable: r.stable,
        legible: readable,
        valor: readable ? text(r.value, MAX_VALUE) : null,
        huella: fingerprints[r.id] ?? null,
      };
    }),
  };
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// El archivo importado viene de fuera: se valida y se recorta todo.
export function parseExport(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (data?.formato !== EXPORT_FORMAT || !Array.isArray(data.senales)) {
    throw new Error('Este archivo no es una huella exportada desde Ghostless.');
  }
  return {
    fecha: text(data.fecha, 40),
    navegador: text(data.navegador, 80) ?? 'desconocido',
    hash: text(data.hash, 64) ?? '',
    senales: data.senales
      .filter((s) => s && typeof s.id === 'string')
      .slice(0, MAX_SIGNALS)
      .map((s) => ({
        id: s.id.slice(0, 40),
        nombre: text(s.nombre, 80) ?? s.id.slice(0, 40),
        estable: Boolean(s.estable),
        legible: Boolean(s.legible),
        valor: text(s.valor, MAX_VALUE),
        huella: text(s.huella, 64),
      })),
  };
}

// Estados: same, different, only-here, only-there, na (ninguno la lee).
export function diffExports(here, there) {
  const theirs = new Map(there.senales.map((s) => [s.id, s]));
  const rows = here.senales.map((mine) => {
    const other = theirs.get(mine.id);
    theirs.delete(mine.id);
    let status;
    if (!other || (mine.legible && !other.legible)) status = 'only-here';
    else if (!mine.legible && other.legible) status = 'only-there';
    else if (!mine.legible && !other.legible) status = 'na';
    else status = mine.huella === other.huella ? 'same' : 'different';
    return { id: mine.id, nombre: mine.nombre, aqui: mine.valor, alli: other?.valor ?? null, status };
  });
  for (const other of theirs.values()) {
    rows.push({ id: other.id, nombre: other.nombre, aqui: null, alli: other.valor, status: other.legible ? 'only-there' : 'na' });
  }
  const count = (status) => rows.filter((r) => r.status === status).length;
  return {
    rows,
    same: count('same'),
    different: count('different'),
    comparable: count('same') + count('different'),
    sameHash: here.hash === there.hash,
  };
}
