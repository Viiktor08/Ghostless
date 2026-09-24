// Lista de candidatas agrupadas por origen. Solo se detectan las que están aquí:
// ninguna web puede listar todas tus fuentes, pero sí comprobar una a una.
const CANDIDATES = {
  Windows: [
    'Bahnschrift', 'Calibri', 'Cambria', 'Cambria Math', 'Candara', 'Consolas', 'Constantia', 'Corbel',
    'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'HoloLens MDL2 Assets', 'Ink Free',
    'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 'Marlett',
    'Microsoft Himalaya', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype',
    'Segoe Fluent Icons', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 'Segoe UI',
    'Segoe UI Emoji', 'Segoe UI Variable', 'Sitka Text', 'Sylfaen',
  ],
  macOS: [
    'American Typewriter', 'Andale Mono', 'Apple Chancery', 'Apple Color Emoji', 'Avenir', 'Avenir Next',
    'Baskerville', 'Big Caslon', 'Bradley Hand', 'Chalkboard SE', 'Chalkduster', 'Charter', 'Cochin',
    'Copperplate', 'Didot', 'Futura', 'Geneva', 'Gill Sans', 'Helvetica Neue', 'Herculanum',
    'Hoefler Text', 'Kohinoor Devanagari', 'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Monaco',
    'Noteworthy', 'Optima', 'Papyrus', 'Phosphate', 'Rockwell', 'Savoye LET', 'Skia', 'Snell Roundhand',
    'Trattatello', 'Zapfino',
  ],
  // Vienen tanto en Windows como en macOS: cuentan, pero no delatan el sistema.
  'Windows y macOS': [
    'Arial Black', 'Comic Sans MS', 'Georgia', 'Impact', 'Microsoft Sans Serif', 'Tahoma', 'Trebuchet MS',
    'Verdana', 'Webdings', 'Wingdings',
  ],
  // Safari resuelve algunas de estas por alias aunque no estén instaladas.
  'Asiáticas (CJK)': [
    'Apple SD Gothic Neo', 'Hiragino Sans', 'Malgun Gothic', 'Microsoft JhengHei', 'Microsoft YaHei',
    'MS Gothic', 'PingFang SC', 'SimSun', 'Yu Gothic',
  ],
  Linux: [
    'Cantarell', 'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif', 'Droid Sans', 'FreeSans',
    'Liberation Mono', 'Liberation Sans', 'Liberation Serif', 'Nimbus Sans', 'Noto Color Emoji',
    'Noto Sans', 'Noto Serif', 'Ubuntu', 'Ubuntu Mono', 'Bitstream Vera Sans', 'Oxygen',
  ],
  Android: ['Roboto', 'Droid Sans Mono', 'Cutive Mono', 'Coming Soon', 'Dancing Script', 'Carrois Gothic SC'],
  'Office y Adobe': [
    'Aptos', 'Calibri Light', 'Century Gothic', 'Garamond', 'Book Antiqua', 'Bookman Old Style',
    'Gill Sans MT', 'Tw Cen MT', 'Agency FB', 'Algerian', 'Bodoni MT', 'Myriad Pro', 'Minion Pro',
    'Adobe Garamond Pro', 'Source Sans Pro',
  ],
  'Instaladas por ti': [
    'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', 'Roboto Mono', 'IBM Plex Sans',
    'Inter', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'FontAwesome', 'Hack', 'Meslo LG S',
  ],
};

const BASES = ['monospace', 'sans-serif', 'serif'];
const SAMPLE = 'mmMwWLliI0O&1 ñ@#€漢字';
const SIZE = 64;

function measure(ctx, font) {
  ctx.font = font;
  const m = ctx.measureText(SAMPLE);
  return `${m.width}|${m.actualBoundingBoxAscent ?? ''}|${m.actualBoundingBoxDescent ?? ''}`;
}

export default [
  {
    id: 'fonts',
    category: 'render',
    name: 'Fuentes instaladas',
    run() {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx?.measureText) return { supported: false };

      // Si el texto mide distinto que con la fuente genérica, la fuente existe.
      const baseline = Object.fromEntries(BASES.map((base) => [base, measure(ctx, `${SIZE}px ${base}`)]));
      const isInstalled = (font) => BASES.some((base) => measure(ctx, `${SIZE}px "${font}", ${base}`) !== baseline[base]);

      const groups = {};
      const detected = [];
      let total = 0;
      for (const [group, fonts] of Object.entries(CANDIDATES)) {
        total += fonts.length;
        const found = fonts.filter(isInstalled);
        if (found.length) groups[group] = found.length;
        detected.push(...found);
      }
      detected.sort();

      const byGroup = Object.entries(groups)
        .sort((a, b) => b[1] - a[1])
        .map(([group, n]) => `${group}: ${n}`)
        .join(', ');
      const value = `${detected.length} de ${total} fuentes probadas${byGroup ? ` · ${byGroup}` : ''}`;
      return { supported: true, value, raw: detected, details: { grupos: groups } };
    },
  },
];
