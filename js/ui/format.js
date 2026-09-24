const bitsFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat('es-ES', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

export const WORLD_POPULATION = 8.2e9;

export const formatBits = (bits) => bitsFormat.format(bits);

// "1 de cada 42,8 millones de navegadores", con el "de" solo cuando toca.
export function oneInPhrase(n) {
  if (n >= WORLD_POPULATION) return `menos de 1 de cada ${compactFormat.format(WORLD_POPULATION)} de navegadores`;
  const amount = n < 10_000 ? integerFormat.format(Math.max(1, Math.round(n))) : compactFormat.format(n);
  return `1 de cada ${amount}${/mill(ón|ones)$/.test(amount) ? ' de' : ''} navegadores`;
}
