// Devuelve el primer valor de la lista que cumple la media query, o null si
// el navegador no entiende ninguno (feature no soportada).
function matchFirst(feature, values) {
  for (const value of values) {
    if (window.matchMedia(`(${feature}: ${value})`).matches) return value;
  }
  return null;
}

function queryAll(features) {
  const raw = {};
  for (const [feature, values] of Object.entries(features)) raw[feature] = matchFirst(feature, values);
  return raw;
}

const describeQueries = (raw) =>
  Object.entries(raw)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

export default [
  {
    id: 'screen',
    category: 'screen',
    name: 'Resolución de pantalla',
    run() {
      const { width, height, colorDepth, pixelDepth } = screen;
      const raw = { width, height, colorDepth, pixelDepth };
      return { supported: true, value: `${width}×${height} · color ${colorDepth} bits`, raw };
    },
  },
  {
    id: 'pixelRatio',
    category: 'screen',
    name: 'Densidad de píxeles',
    // Cambia con el zoom de la página: no entra en el hash.
    stable: false,
    run() {
      const dpr = window.devicePixelRatio;
      if (typeof dpr !== 'number') return { supported: false };
      const physical = `${Math.round(screen.width * dpr)}×${Math.round(screen.height * dpr)}`;
      return { supported: true, value: `×${+dpr.toFixed(3)} · ${physical} px físicos`, raw: dpr };
    },
  },
  {
    id: 'availableScreen',
    category: 'screen',
    name: 'Área útil de pantalla',
    stable: false,
    run() {
      const { width, height, availWidth, availHeight } = screen;
      const raw = { availWidth, availHeight, availLeft: screen.availLeft ?? null, availTop: screen.availTop ?? null };
      const bars = [];
      if (height - availHeight > 0) bars.push(`${height - availHeight}px en vertical`);
      if (width - availWidth > 0) bars.push(`${width - availWidth}px en horizontal`);
      const value = `${availWidth}×${availHeight}${bars.length ? ` · barras del sistema: ${bars.join(', ')}` : ''}`;
      return { supported: true, value, raw };
    },
  },
  {
    id: 'windowSize',
    category: 'screen',
    name: 'Tamaño de ventana',
    stable: false,
    run() {
      const { innerWidth, innerHeight, outerWidth, outerHeight } = window;
      const raw = { innerWidth, innerHeight, outerWidth, outerHeight };
      const chromeHeight = outerHeight - innerHeight;
      const chromeWidth = outerWidth - innerWidth;
      let value = `interior ${innerWidth}×${innerHeight} · exterior ${outerWidth}×${outerHeight}`;
      if (outerWidth > 0 && (chromeWidth > 150 || chromeHeight > 250)) value += ' · ¿DevTools abiertas?';
      return { supported: true, value, raw };
    },
  },
  {
    id: 'displayCaps',
    category: 'screen',
    name: 'Capacidades del display',
    run() {
      if (typeof window.matchMedia !== 'function') return { supported: false };
      const raw = queryAll({
        'color-gamut': ['rec2020', 'p3', 'srgb'],
        'dynamic-range': ['high', 'standard'],
        hover: ['hover', 'none'],
        'any-hover': ['hover', 'none'],
        pointer: ['fine', 'coarse', 'none'],
        'any-pointer': ['fine', 'coarse', 'none'],
        'inverted-colors': ['inverted', 'none'],
        monochrome: ['0'],
        'display-mode': ['fullscreen', 'standalone', 'minimal-ui', 'browser'],
      });
      return { supported: true, value: describeQueries(raw), raw };
    },
  },
  {
    id: 'preferences',
    category: 'screen',
    name: 'Preferencias de accesibilidad',
    // El modo oscuro automático cambia según la hora: no entra en el hash.
    stable: false,
    run() {
      if (typeof window.matchMedia !== 'function') return { supported: false };
      const raw = queryAll({
        'prefers-color-scheme': ['dark', 'light'],
        'prefers-reduced-motion': ['reduce', 'no-preference'],
        'prefers-contrast': ['more', 'less', 'custom', 'no-preference'],
        'prefers-reduced-transparency': ['reduce', 'no-preference'],
        'prefers-reduced-data': ['reduce', 'no-preference'],
        'forced-colors': ['active', 'none'],
      });
      return { supported: true, value: describeQueries(raw), raw };
    },
  },
];
