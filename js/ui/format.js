const bitsFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat('es-ES', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

export const WORLD_POPULATION = 8.2e9;

export const formatBits = (bits) => bitsFormat.format(bits);

export function formatOneIn(n) {
  if (n >= WORLD_POPULATION) return `más de ${compactFormat.format(WORLD_POPULATION)}`;
  if (n < 10_000) return integerFormat.format(Math.max(1, Math.round(n)));
  return compactFormat.format(n);
}
