import { signalBits } from './data/entropy.js';

// log2(8.200 millones de personas): con ~33 bits se podría distinguir a cualquiera.
export const WORLD_BITS = Math.log2(8.2e9);

// Rendimientos decrecientes: las señales están correlacionadas (pantalla ↔
// dispositivo ↔ User-Agent), así que cada una aporta menos que la anterior.
export const DECAY = 0.8;

export const LEVELS = [
  { min: 0, id: 'low', label: 'Discreto', text: 'Tu navegador se parece a muchos otros. Te escondes bien entre la multitud.' },
  { min: 12, id: 'mid', label: 'Reconocible', text: 'Compartes huella con bastante gente, pero un tracker ya puede acotarte mucho.' },
  { min: 20, id: 'high', label: 'Muy reconocible', text: 'Tu combinación es rara: un tracker podría reconocerte entre millones de visitas.' },
  { min: 28, id: 'extreme', label: 'Casi inconfundible', text: 'Según esta estimación, muy poca gente en el mundo tendría tu misma combinación.' },
];

export function riskFor(bits) {
  if (bits >= 5) return 'high';
  if (bits >= 2) return 'mid';
  return 'low';
}

export function computeScore(results) {
  const perSignal = {};
  for (const r of results) perSignal[r.id] = signalBits(r);

  const ranked = Object.entries(perSignal)
    .filter(([, bits]) => bits > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, bits], i) => ({ id, bits, weight: DECAY ** i, contribution: bits * DECAY ** i }));

  const bits = ranked.reduce((sum, r) => sum + r.contribution, 0);
  const naive = ranked.reduce((sum, r) => sum + r.bits, 0);
  const level = LEVELS.findLast((l) => bits >= l.min);

  return {
    bits,
    naive,
    perSignal,
    ranked,
    level,
    oneIn: 2 ** bits,
    percent: Math.min(100, (bits / WORLD_BITS) * 100),
  };
}
