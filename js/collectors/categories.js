// Orden en el que se pintan las categorías.
export const CATEGORIES = [
  { id: 'browser', label: 'Navegador y sistema', icon: '🖥️' },
  { id: 'screen', label: 'Pantalla y ventana', icon: '📺' },
  { id: 'render', label: 'Renderizado', icon: '🎨' },
  { id: 'audio', label: 'Audio', icon: '🔊' },
  { id: 'locale', label: 'Localización', icon: '🌍' },
  { id: 'network', label: 'Red y dispositivos', icon: '📡' },
  { id: 'storage', label: 'Almacenamiento', icon: '💾' },
  { id: 'caps', label: 'Multimedia y capacidades', icon: '🎬' },
  { id: 'privacy', label: 'Señales de privacidad', icon: '🛡️' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
