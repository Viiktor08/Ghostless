const yesNo = (v) => (v ? 'sí' : 'no');

// Marcas "GREASE" que Chromium mete a propósito en userAgentData (p. ej. "Not)A;Brand").
const isGreaseBrand = (brand) => /not.?a.?brand/i.test(brand);

export default [
  {
    id: 'userAgent',
    category: 'browser',
    name: 'User-Agent',
    run() {
      const ua = navigator.userAgent;
      return { supported: typeof ua === 'string', value: ua, raw: ua };
    },
  },
  {
    id: 'clientHints',
    category: 'browser',
    name: 'Client Hints',
    async run() {
      const uad = navigator.userAgentData;
      if (!uad) return { supported: false };

      const raw = {
        brands: uad.brands.map((b) => `${b.brand} ${b.version}`),
        mobile: uad.mobile,
        platform: uad.platform,
      };
      try {
        const high = await uad.getHighEntropyValues([
          'architecture',
          'bitness',
          'model',
          'platformVersion',
          'fullVersionList',
          'wow64',
          'formFactors',
        ]);
        Object.assign(raw, {
          architecture: high.architecture,
          bitness: high.bitness,
          model: high.model,
          platformVersion: high.platformVersion,
          fullVersionList: high.fullVersionList?.map((b) => `${b.brand} ${b.version}`),
          wow64: high.wow64,
          formFactors: high.formFactors,
        });
      } catch {
        // Algunos navegadores Chromium rechazan las pistas de alta entropía.
      }

      const brands = (raw.fullVersionList ?? raw.brands).filter((b) => !isGreaseBrand(b));
      const system = [raw.platform, raw.platformVersion].filter(Boolean).join(' ');
      const arch = raw.architecture ? `${raw.architecture}${raw.bitness ? ` ${raw.bitness}-bit` : ''}` : null;
      const value = [system, arch, raw.model || null, brands.join(', ')].filter(Boolean).join(' · ');
      return { supported: true, value, raw };
    },
  },
  {
    id: 'platform',
    category: 'browser',
    name: 'Plataforma',
    run() {
      const platform = navigator.platform;
      return { supported: typeof platform === 'string', value: platform || '(vacío)', raw: platform };
    },
  },
  {
    id: 'hardwareConcurrency',
    category: 'browser',
    name: 'Núcleos de CPU',
    run() {
      const cores = navigator.hardwareConcurrency;
      if (typeof cores !== 'number') return { supported: false };
      return { supported: true, value: `${cores} hilos lógicos`, raw: cores };
    },
  },
  {
    id: 'deviceMemory',
    category: 'browser',
    name: 'Memoria RAM',
    run() {
      const memory = navigator.deviceMemory;
      if (typeof memory !== 'number') return { supported: false };
      return { supported: true, value: `${memory} GB (redondeado)`, raw: memory };
    },
  },
  {
    id: 'touch',
    category: 'browser',
    name: 'Pantalla táctil',
    run() {
      const points = navigator.maxTouchPoints;
      if (typeof points !== 'number') return { supported: false };
      const raw = { maxTouchPoints: points, touchEvent: 'ontouchstart' in window };
      const value = points > 0 ? `sí · hasta ${points} dedos a la vez` : 'no';
      return { supported: true, value, raw };
    },
  },
  {
    id: 'languages',
    category: 'browser',
    name: 'Idiomas',
    run() {
      const languages = navigator.languages?.length ? [...navigator.languages] : [navigator.language];
      if (!languages[0]) return { supported: false };
      return { supported: true, value: languages.join(', '), raw: languages };
    },
  },
  {
    id: 'privacyFlags',
    category: 'browser',
    name: 'Cookies, DNT y GPC',
    run() {
      const dnt = navigator.doNotTrack ?? window.doNotTrack ?? navigator.msDoNotTrack ?? null;
      const raw = {
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: dnt,
        globalPrivacyControl: navigator.globalPrivacyControl ?? null,
      };
      const dntOn = dnt === '1' || dnt === 'yes';
      const gpc = raw.globalPrivacyControl === null ? 'no soportado' : yesNo(raw.globalPrivacyControl);
      const value = `Cookies: ${yesNo(raw.cookieEnabled)} · DNT: ${dnt === null ? 'no soportado' : yesNo(dntOn)} · GPC: ${gpc}`;
      return { supported: true, value, raw };
    },
  },
  {
    id: 'pdfViewer',
    category: 'browser',
    name: 'Visor de PDF',
    run() {
      const enabled = navigator.pdfViewerEnabled;
      if (typeof enabled !== 'boolean') return { supported: false };
      return { supported: true, value: enabled ? 'integrado' : 'desactivado', raw: enabled };
    },
  },
  {
    id: 'webdriver',
    category: 'browser',
    name: 'Automatización',
    run() {
      const automated = navigator.webdriver;
      if (typeof automated !== 'boolean') return { supported: false };
      const value = automated ? 'sí: navegador controlado por software' : 'no: parece un humano';
      return { supported: true, value, raw: automated };
    },
  },
];
