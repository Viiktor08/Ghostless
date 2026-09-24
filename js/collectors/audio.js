function renderBuffer(ctx) {
  return new Promise((resolve, reject) => {
    // Safari antiguo solo avisa con el evento, los demás con la promesa.
    ctx.oncomplete = (event) => resolve(event.renderedBuffer);
    const promise = ctx.startRendering();
    promise?.then?.(resolve, reject);
  });
}

// Oscilador + compresor renderizados sin sonar: la suma de las muestras varía
// con la pila de audio del sistema, el navegador y el hardware.
async function audioSignature() {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Offline(1, 5000, 44100);
  const oscillator = ctx.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.value = 10000;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -50;
  compressor.knee.value = 40;
  compressor.ratio.value = 12;
  compressor.attack.value = 0;
  compressor.release.value = 0.25;

  oscillator.connect(compressor);
  compressor.connect(ctx.destination);
  oscillator.start(0);

  const samples = (await renderBuffer(ctx)).getChannelData(0);
  let sum = 0;
  for (let i = 4500; i < samples.length; i++) sum += Math.abs(samples[i]);
  return sum;
}

function waitForVoices(timeoutMs) {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      speechSynthesis.removeEventListener?.('voiceschanged', finish);
      resolve(speechSynthesis.getVoices());
    };
    const timer = setTimeout(finish, timeoutMs);
    speechSynthesis.addEventListener?.('voiceschanged', finish);
  });
}

export default [
  {
    id: 'audio',
    category: 'audio',
    name: 'Huella de audio',
    async run() {
      if (!window.OfflineAudioContext && !window.webkitOfflineAudioContext) return { supported: false };
      const first = await audioSignature();
      const second = await audioSignature();
      const noisy = first !== second;
      const empty = first === 0;
      let value = String(first);
      if (empty) value = 'bloqueado: el audio sale en silencio';
      else if (noisy) value += ' · con ruido añadido';
      return {
        supported: true,
        value,
        raw: String(first),
        blocked: noisy || empty,
        details: { dosPasadasIguales: !noisy },
      };
    },
  },
  {
    id: 'speechVoices',
    category: 'audio',
    name: 'Voces de síntesis',
    async run() {
      if (!('speechSynthesis' in window)) return { supported: false };
      let voices = speechSynthesis.getVoices();
      if (!voices.length) voices = await waitForVoices(1200);

      // Sin la marca "default": Chromium no siempre elige la misma voz por defecto.
      const raw = voices.map((v) => `${v.name}|${v.lang}|${v.localService ? 'local' : 'remota'}`).sort();
      if (!voices.length) return { supported: true, value: 'ninguna voz expuesta', raw };

      const languages = new Set(voices.map((v) => v.lang));
      const defaultVoice = voices.find((v) => v.default);
      const value = `${voices.length} voces en ${languages.size} idiomas${defaultVoice ? ` · por defecto: ${defaultVoice.name}` : ''}`;
      return { supported: true, value, raw, details: { porDefecto: defaultVoice?.name ?? null } };
    },
  },
];
