import { shortHash } from '../hash.js';

// Features CSS recientes: qué soporta tu navegador delata su motor y versión.
const CSS_FEATURES = {
  ':has()': 'selector(:has(a))',
  'container queries': 'container-type: inline-size',
  'scroll-state queries': 'container-type: scroll-state',
  oklch: 'color: oklch(0.5 0.1 200)',
  'color-mix()': 'color: color-mix(in srgb, red, blue)',
  'contrast-color()': 'color: contrast-color(red)',
  'scroll-driven animations': 'animation-timeline: scroll()',
  'text-wrap: balance': 'text-wrap: balance',
  'text-wrap: pretty': 'text-wrap: pretty',
  'anchor positioning': 'anchor-name: --a',
  'view transitions': 'view-transition-name: a',
  'field-sizing': 'field-sizing: content',
  'interpolate-size': 'interpolate-size: allow-keywords',
  'transition-behavior': 'transition-behavior: allow-discrete',
  ':popover-open': 'selector(:popover-open)',
  '::details-content': 'selector(::details-content)',
  'text-box': 'text-box: trim-both cap alphabetic',
  'corner-shape': 'corner-shape: squircle',
  'appearance: base-select': 'appearance: base-select',
  'sibling-index()': 'order: sibling-index()',
  'if()': 'color: if(style(--x: 1): red; else: blue)',
  'reading-flow': 'reading-flow: normal',
  'initial-letter': 'initial-letter: 2',
  'hyphenate-limit-chars': 'hyphenate-limit-chars: auto',
  'font-size-adjust': 'font-size-adjust: from-font',
  'math-depth': 'math-depth: 1',
  'dynamic-range-limit': 'dynamic-range-limit: standard',
  'text-spacing-trim': 'text-spacing-trim: normal',
  'box-decoration-break': 'box-decoration-break: clone',
  'backdrop-filter': 'backdrop-filter: blur(1px)',
  '-webkit-touch-callout': '-webkit-touch-callout: none',
  '-moz-appearance': '-moz-appearance: none',
};

// Presencia de APIs: cada navegador y versión tiene su propio "perfil".
const API_CHECKS = {
  WebGL2: () => 'WebGL2RenderingContext' in window,
  WebGPU: () => 'gpu' in navigator,
  WebAssembly: () => typeof WebAssembly === 'object',
  SharedArrayBuffer: () => typeof SharedArrayBuffer === 'function',
  WebCodecs: () => 'VideoDecoder' in window,
  WebTransport: () => 'WebTransport' in window,
  WebHID: () => 'hid' in navigator,
  WebUSB: () => 'usb' in navigator,
  WebSerial: () => 'serial' in navigator,
  WebBluetooth: () => 'bluetooth' in navigator,
  WebNFC: () => 'NDEFReader' in window,
  WebXR: () => 'xr' in navigator,
  'Web Share': () => 'share' in navigator,
  'Wake Lock': () => 'wakeLock' in navigator,
  'Web Locks': () => 'locks' in navigator,
  'File System Access': () => 'showOpenFilePicker' in window,
  EyeDropper: () => 'EyeDropper' in window,
  BarcodeDetector: () => 'BarcodeDetector' in window,
  'Payment Request': () => 'PaymentRequest' in window,
  'Apple Pay': () => 'ApplePaySession' in window,
  Notifications: () => 'Notification' in window,
  Push: () => 'PushManager' in window,
  'Navigation API': () => 'navigation' in window,
  'View Transitions': () => 'startViewTransition' in document,
  'Scheduler API': () => 'scheduler' in window,
  'Compression Streams': () => 'CompressionStream' in window,
  'Trusted Types': () => 'trustedTypes' in window,
  Sanitizer: () => 'Sanitizer' in window,
  CloseWatcher: () => 'CloseWatcher' in window,
  'Document PiP': () => 'documentPictureInPicture' in window,
  'Window Management': () => 'getScreenDetails' in window,
  'Compute Pressure': () => 'PressureObserver' in window,
  'Idle Detection': () => 'IdleDetector' in window,
  'Keyboard Map': () => 'keyboard' in navigator,
  'Virtual Keyboard': () => 'virtualKeyboard' in navigator,
  'Speech Recognition': () => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
  'IA integrada (LanguageModel)': () => 'LanguageModel' in window,
  'IA integrada (Translator)': () => 'Translator' in window,
  'Battery Status': () => 'getBattery' in navigator,
  'Gesture Events (Safari)': () => 'GestureEvent' in window,
  'mozInnerScreenX (Firefox)': () => 'mozInnerScreenX' in window,
  'window.chrome': () => 'chrome' in window,
};

function checkAll(checks) {
  const raw = {};
  for (const [name, check] of Object.entries(checks)) {
    try {
      raw[name] = Boolean(check());
    } catch {
      raw[name] = false;
    }
  }
  return raw;
}

// Paso mínimo entre dos lecturas distintas de performance.now().
function measureTimerResolution() {
  const start = performance.now();
  let last = start;
  let min = Infinity;
  let steps = 0;
  while (steps < 20 && last - start < 150) {
    const now = performance.now();
    if (now !== last) {
      min = Math.min(min, now - last);
      steps += 1;
      last = now;
    }
  }
  return steps ? min : null;
}

function formatMs(ms) {
  if (ms >= 1) return `${+ms.toFixed(2)} ms`;
  return `${+(ms * 1000).toFixed(1)} µs`;
}

export default [
  {
    id: 'cssFeatures',
    category: 'caps',
    name: 'Soporte de CSS moderno',
    async run() {
      if (typeof CSS?.supports !== 'function') return { supported: false };
      const raw = checkAll(Object.fromEntries(Object.entries(CSS_FEATURES).map(([n, rule]) => [n, () => CSS.supports(rule)])));
      const count = Object.values(raw).filter(Boolean).length;
      const value = `${count}/${Object.keys(raw).length} features · perfil ${await shortHash(JSON.stringify(raw))}`;
      return { supported: true, value, raw };
    },
  },
  {
    id: 'apis',
    category: 'caps',
    name: 'APIs disponibles',
    async run() {
      const raw = checkAll(API_CHECKS);
      const count = Object.values(raw).filter(Boolean).length;
      const value = `${count}/${Object.keys(raw).length} APIs · perfil ${await shortHash(JSON.stringify(raw))}`;
      return { supported: true, value, raw };
    },
  },
  {
    id: 'timerPrecision',
    category: 'caps',
    name: 'Precisión del reloj',
    run() {
      if (typeof performance?.now !== 'function') return { supported: false };
      const resolution = measureTimerResolution();
      const isolated = window.crossOriginIsolated === true;
      if (resolution === null) return { supported: true, value: 'más de 150 ms (reloj congelado)', raw: 'frozen', blocked: true };
      // Redondeado para que el ruido de coma flotante no cambie la huella.
      const rounded = Number(resolution.toPrecision(1));
      const value = `${formatMs(resolution)}${isolated ? ' · aislamiento cross-origin' : ''}`;
      return { supported: true, value, raw: { resolution: rounded, isolated }, blocked: resolution >= 16 };
    },
  },
];
