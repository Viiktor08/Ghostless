// Bits de información ORIENTATIVOS por señal. No son medidas propias: son
// órdenes de magnitud inspirados en estudios públicos (EFF Panopticlick /
// Cover Your Tracks, AmIUnique, "Hiding in the Crowd") y ajustados a mano.
// Un valor muy común identifica menos que uno raro, así que varias señales
// ajustan sus bits según el valor concreto leído.

export const BASE_BITS = {
  userAgent: 7,
  clientHints: 4,
  platform: 1,
  hardwareConcurrency: 2,
  deviceMemory: 1.5,
  touch: 1,
  languages: 4,
  privacyFlags: 0.5,
  pdfViewer: 0.3,
  webdriver: 0.1,
  screen: 5,
  pixelRatio: 2,
  availableScreen: 2,
  windowSize: 4,
  displayCaps: 2,
  preferences: 1.5,
  canvas: 8,
  webgl: 4.5,
  webglCaps: 3,
  webgpu: 2,
  fonts: 6,
  audio: 3.5,
  speechVoices: 3,
  timezone: 3,
  intlLocale: 2,
  intlFormats: 1,
  connection: 1.5,
  codecs: 1.5,
  mediaDevices: 1,
  gamepads: 0.1,
  webrtc: 0.5,
  storageQuota: 2,
  storageApis: 0.5,
  cssFeatures: 2.5,
  apis: 2.5,
  timerPrecision: 1,
  adBlock: 0.6,
  antiFingerprinting: 0.2,
};

const COMMON_SCREENS = new Set([
  '1920x1080', '1366x768', '1536x864', '1440x900', '1280x720', '1600x900', '2560x1440', '1280x800',
  '1920x1200', '1680x1050', '1280x1024', '2560x1600', '3840x2160', '1512x982', '1470x956', '1728x1117',
  '390x844', '393x852', '393x873', '412x915', '414x896', '375x812', '360x800', '430x932',
]);

const ADJUST = {
  // Chrome "congela" el User-Agent (versión menor a 0.0.0): lo comparten millones.
  userAgent: ({ raw }) => (/Chrome\/\d+\.0\.0\.0/.test(raw) ? 5 : 7),
  clientHints: ({ raw }) => (raw.model ? 7 : 4),
  hardwareConcurrency: ({ raw }) => ([4, 8].includes(raw) ? 1.5 : 3),
  deviceMemory: ({ raw }) => (raw === 8 ? 1 : 2),
  languages: ({ raw }) => (raw.length === 1 ? 2.5 : raw.length === 2 ? 4.5 : 6),
  privacyFlags: ({ raw }) => 0.5 + (raw.doNotTrack === '1' ? 1.5 : 0) + (raw.globalPrivacyControl ? 1 : 0),
  webdriver: ({ raw }) => (raw ? 4 : 0.1),
  screen: ({ raw }) => (COMMON_SCREENS.has(`${raw.width}x${raw.height}`) ? 3.5 : 6),
  // Una ventana maximizada se parece a la pantalla; una a medida es casi única.
  windowSize: ({ raw }) => (raw.outerWidth >= screen.availWidth - 16 ? 2 : 5),
  webgl: ({ details }) => (details?.masked ? 1.5 : 4.5),
  webgpu: ({ raw }) => (raw === 'no-adapter' ? 0.5 : 2),
  fonts: ({ raw, details }) => {
    if (!raw.length) return 0.5;
    const groups = details?.grupos ?? {};
    const personal = (groups['Instaladas por ti'] ?? 0) + (groups['Office y Adobe'] ?? 0);
    return 4 + Math.min(5, personal * 1.2);
  },
  speechVoices: ({ raw }) => (raw.length ? 3 : 0.3),
  timezone: ({ raw }) => (/^(UTC|Etc\/UTC)$/.test(raw.timeZone) ? 1 : 3),
  mediaDevices: ({ raw }) => (raw.videoinput + raw.audioinput + raw.audiooutput > 3 ? 2 : 1),
  gamepads: ({ raw }) => (raw.length ? 3 : 0.1),
  webrtc: ({ raw }) => (raw.exposed?.length ? 6 : 0.5),
  adBlock: ({ raw }) => (raw ? 1.7 : 0.6),
  antiFingerprinting: ({ raw }) => (raw.length ? 1.5 : 0.2),
};

// Bits que aporta una señal concreta. Las bloqueadas o con ruido no aportan:
// el ruido cambia en cada sesión y no sirve para seguirte.
export function signalBits(result) {
  if (!result.supported || result.error || result.blocked) return 0;
  const adjust = ADJUST[result.id];
  if (adjust) {
    try {
      return adjust(result);
    } catch {
      // Valor con forma inesperada: se usa el valor base.
    }
  }
  return BASE_BITS[result.id] ?? 1;
}
