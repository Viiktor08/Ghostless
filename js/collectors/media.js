const CODECS = {
  'H.264': 'video/mp4; codecs="avc1.42E01E"',
  HEVC: 'video/mp4; codecs="hvc1.1.6.L93.B0"',
  VP8: 'video/webm; codecs="vp8"',
  VP9: 'video/webm; codecs="vp9"',
  AV1: 'video/mp4; codecs="av01.0.05M.08"',
  Theora: 'video/ogg; codecs="theora"',
  AAC: 'audio/mp4; codecs="mp4a.40.2"',
  MP3: 'audio/mpeg',
  Opus: 'audio/webm; codecs="opus"',
  Vorbis: 'audio/ogg; codecs="vorbis"',
  FLAC: 'audio/flac',
  WAV: 'audio/wav; codecs="1"',
  'Dolby AC-3': 'audio/mp4; codecs="ac-3"',
  'Dolby E-AC-3': 'audio/mp4; codecs="ec-3"',
  HLS: 'application/vnd.apple.mpegurl',
};

export default [
  {
    id: 'codecs',
    category: 'caps',
    name: 'Códecs de audio y vídeo',
    run() {
      const video = document.createElement('video');
      if (typeof video.canPlayType !== 'function') return { supported: false };
      const mse = window.MediaSource ?? window.ManagedMediaSource;
      const raw = {};
      const playable = [];
      for (const [name, type] of Object.entries(CODECS)) {
        const play = video.canPlayType(type) || 'no';
        const stream = typeof mse?.isTypeSupported === 'function' ? mse.isTypeSupported(type) : null;
        raw[name] = { play, stream };
        if (play !== 'no' || stream) playable.push(name);
      }
      const value = `${playable.length}/${Object.keys(CODECS).length} · ${playable.join(', ')}`;
      return { supported: true, value, raw };
    },
  },
  {
    id: 'mediaDevices',
    category: 'network',
    name: 'Cámaras, micros y altavoces',
    // Cambia al conectar unos auriculares o una webcam.
    stable: false,
    async run() {
      if (!navigator.mediaDevices?.enumerateDevices) return { supported: false };
      const devices = await navigator.mediaDevices.enumerateDevices();
      const count = { videoinput: 0, audioinput: 0, audiooutput: 0 };
      for (const d of devices) count[d.kind] = (count[d.kind] ?? 0) + 1;
      const labelsVisible = devices.some((d) => d.label);
      const value = `${count.videoinput} cámaras · ${count.audioinput} micrófonos · ${count.audiooutput} salidas de audio${labelsVisible ? ' · con nombres visibles' : ''}`;
      return { supported: true, value, raw: { ...count, labelsVisible } };
    },
  },
  {
    id: 'gamepads',
    category: 'network',
    name: 'Mandos de juego',
    stable: false,
    run() {
      if (typeof navigator.getGamepads !== 'function') return { supported: false };
      const pads = [...navigator.getGamepads()].filter(Boolean).map((p) => p.id);
      const value = pads.length ? `${pads.length} conectados · ${pads.join(', ')}` : 'ninguno visible (se revelan al pulsar un botón)';
      return { supported: true, value, raw: pads };
    },
  },
];
