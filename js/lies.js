// Detector de mentiras: cruza señales entre sí buscando incoherencias (algo
// falseado), rastros de protección anti-fingerprinting y automatización.

export function parseUserAgent(ua = '') {
  const os = /Windows NT/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'iOS'
        : /CrOS/.test(ua)
          ? 'ChromeOS'
          : /Macintosh|Mac OS X/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : null;
  const browser = /Firefox\/|FxiOS/.test(ua)
    ? 'Firefox'
    : /Edg(A|iOS)?\//.test(ua)
      ? 'Edge'
      : /OPR\/|Opera/.test(ua)
        ? 'Opera'
        : /SamsungBrowser/.test(ua)
          ? 'Samsung Internet'
          : /Chrome\/|CriOS/.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : null;
  // En iOS todos los navegadores usan WebKit por obligación.
  let engine = null;
  if (os === 'iOS' || (browser === 'Safari' && /AppleWebKit/.test(ua))) engine = 'WebKit';
  else if (browser === 'Firefox') engine = 'Gecko';
  else if (/Chrome\//.test(ua)) engine = 'Blink';
  const major = Number((ua.match(/(?:Firefox|Chrome|CriOS|FxiOS|Version)\/(\d+)/) ?? [])[1]) || null;
  return { os, browser, engine, major, mobile: /Mobi|Android|iPhone|iPad|iPod/.test(ua) };
}

// Motor real según las APIs que existen, no según lo que dice el User-Agent.
function realEngine(apis) {
  if (!apis) return null;
  if (apis['mozInnerScreenX (Firefox)']) return 'Gecko';
  if (apis['Gesture Events (Safari)']) return 'WebKit';
  return 'Blink';
}

const PLATFORM_PATTERN = {
  Windows: /^Win/,
  macOS: /^Mac/,
  Linux: /Linux/,
  Android: /Linux|Android/,
  iOS: /iPhone|iPad|iPod/,
  ChromeOS: /Linux|CrOS/,
};

const HINTS_PLATFORM = { Windows: 'Windows', macOS: 'macOS', Linux: 'Linux', Android: 'Android', iOS: 'iOS', ChromeOS: 'Chrome OS' };

// Regiones de idioma por continente (solo para detectar choques gordos).
const EUROPE = new Set('ES FR DE IT PT GB IE NL BE CH AT SE NO DK FI PL CZ SK HU RO BG GR HR SI RS UA LT LV EE IS LU CY MT AD'.split(' '));
const AMERICA = new Set('US CA MX AR BR CL CO PE VE EC UY PY BO CR PA GT HN SV NI CU DO PR'.split(' '));

const FONT_GROUP_OS = { Windows: 'Windows', macOS: 'macOS', Linux: 'Linux' };

const ok = (r) => Boolean(r && r.supported && !r.error);

const CHECKS = [
  // --- Automatización ---
  ({ webdriver }) =>
    ok(webdriver) && webdriver.raw === true && {
      kind: 'automation',
      severity: 'high',
      title: 'Navegador controlado por un programa',
      detail: 'navigator.webdriver está activado: Selenium, Playwright o Puppeteer están manejando este navegador. Es lo primero que miran los sistemas anti-bots.',
    },

  ({ webgl }) =>
    ok(webgl) && /SwiftShader|llvmpipe|Software Rasterizer|softpipe/i.test(webgl.raw?.renderer) && {
      kind: 'automation',
      severity: 'mid',
      title: 'Gráficos renderizados por software',
      detail: `La GPU es «${webgl.raw.renderer}»: no hay tarjeta gráfica real. Típico de máquinas virtuales, servidores y navegadores automatizados.`,
    },

  // --- Incoherencias ---
  ({ platform }, ua) => {
    if (!ok(platform) || !platform.raw || !ua.os) return null;
    const pattern = PLATFORM_PATTERN[ua.os];
    return pattern && !pattern.test(platform.raw) && {
      kind: 'inconsistency',
      severity: 'high',
      title: 'El User-Agent y la plataforma no coinciden',
      detail: `Tu User-Agent dice ${ua.os}, pero navigator.platform dice «${platform.raw}». Suele pasar con extensiones que cambian el User-Agent.`,
    };
  },

  ({ clientHints }, ua) => {
    if (!ok(clientHints)) return null;
    if (ua.engine && ua.engine !== 'Blink' && ua.os !== 'iOS') {
      return {
        kind: 'inconsistency',
        severity: 'high',
        title: `Dices ser ${ua.browser}, pero tienes Client Hints`,
        detail: 'navigator.userAgentData solo existe en navegadores basados en Chromium. Tu User-Agent está falseado.',
      };
    }
    const expected = HINTS_PLATFORM[ua.os];
    if (expected && clientHints.raw.platform && clientHints.raw.platform !== expected) {
      return {
        kind: 'inconsistency',
        severity: 'high',
        title: 'El User-Agent y los Client Hints no coinciden',
        detail: `El User-Agent dice ${ua.os}, pero los Client Hints dicen ${clientHints.raw.platform}.`,
      };
    }
    const chromium = clientHints.raw.brands?.find((b) => /^(Chromium|Google Chrome) /.test(b));
    const hintsMajor = Number(chromium?.split(' ').pop());
    if (ua.browser === 'Chrome' && ua.major && hintsMajor && ua.major !== hintsMajor) {
      return {
        kind: 'inconsistency',
        severity: 'high',
        title: 'Dos versiones distintas del navegador',
        detail: `El User-Agent dice versión ${ua.major}, pero los Client Hints dicen ${hintsMajor}.`,
      };
    }
    return null;
  },

  ({ apis }, ua) => {
    const engine = realEngine(apis?.raw);
    return ok(apis) && ua.engine && engine && engine !== ua.engine && {
      kind: 'inconsistency',
      severity: 'high',
      title: `Dices ser ${ua.browser ?? ua.engine}, pero te comportas como otro navegador`,
      detail: `Por su User-Agent, tu navegador debería usar el motor ${ua.engine}, pero las APIs disponibles son las de ${engine}.`,
    };
  },

  ({ webgl }, ua) => {
    if (!ok(webgl) || !ua.os) return null;
    const renderer = String(webgl.raw?.renderer ?? '');
    let wrong = null;
    if (/Direct3D|D3D1\d|D3D9/i.test(renderer) && ua.os !== 'Windows') wrong = 'Windows (Direct3D)';
    else if (/Apple (M\d|GPU)|Metal/i.test(renderer) && !['macOS', 'iOS'].includes(ua.os)) wrong = 'Apple';
    return wrong && {
      kind: 'inconsistency',
      severity: 'high',
      title: 'Tu tarjeta gráfica no encaja con tu sistema',
      detail: `El User-Agent dice ${ua.os}, pero la GPU («${renderer}») es propia de ${wrong}.`,
    };
  },

  ({ fonts }, ua) => {
    const groups = fonts?.details?.grupos;
    if (!ok(fonts) || !groups || !FONT_GROUP_OS[ua.os]) return null;
    const own = groups[FONT_GROUP_OS[ua.os]] ?? 0;
    const [other, count] = Object.entries(groups)
      .filter(([group]) => Object.values(FONT_GROUP_OS).includes(group) && group !== ua.os)
      .sort((a, b) => b[1] - a[1])[0] ?? [];
    return own === 0 && count >= 5 && {
      kind: 'inconsistency',
      severity: 'high',
      title: 'Tus fuentes son de otro sistema',
      detail: `El User-Agent dice ${ua.os}, pero no tienes ninguna de sus fuentes típicas y sí ${count} de ${other}.`,
    };
  },

  ({ touch }, ua) =>
    ok(touch) && ua.mobile && ua.os !== 'iOS' && touch.raw.maxTouchPoints === 0 && {
      kind: 'inconsistency',
      severity: 'mid',
      title: 'Un móvil sin pantalla táctil',
      detail: 'Tu User-Agent es de móvil, pero no hay pantalla táctil. ¿Emulación de dispositivo en DevTools o User-Agent cambiado?',
    },

  ({ screen: scr, windowSize }) => {
    if (!ok(scr) || !ok(windowSize)) return null;
    const tooWide = windowSize.raw.innerWidth > scr.raw.width + 1;
    const tooTall = windowSize.raw.innerHeight > scr.raw.height + 1;
    return (tooWide || tooTall) && {
      kind: 'inconsistency',
      severity: 'low',
      title: 'La ventana es más grande que la pantalla',
      detail: 'O la resolución de pantalla está falseada, o tienes el zoom de la página por debajo del 100 %.',
    };
  },

  ({ languages, timezone }) => {
    if (!ok(languages) || !ok(timezone)) return null;
    const primary = languages.raw[0] ?? '';
    const region = primary.split('-')[1]?.toUpperCase();
    // en-US y en-GB son el idioma por defecto de medio mundo: no dicen dónde estás.
    if (!region || /^en-(US|GB)$/i.test(primary)) return null;
    const zone = String(timezone.raw.timeZone ?? '');
    const langContinent = EUROPE.has(region) ? 'Europe' : AMERICA.has(region) ? 'America' : null;
    const zoneContinent = zone.split('/')[0];
    return langContinent && ['Europe', 'America'].includes(zoneContinent) && langContinent !== zoneContinent && {
      kind: 'inconsistency',
      severity: 'low',
      title: 'Tu idioma y tu zona horaria apuntan a sitios distintos',
      detail: `Tu idioma principal es ${primary}, pero tu zona horaria es ${zone}. Normal si viajas; también es un indicio típico de VPN.`,
    };
  },

  ({ touch }, ua) =>
    ok(touch) && ua.os === 'macOS' && touch.raw.maxTouchPoints > 1 && {
      kind: 'info',
      severity: 'low',
      title: 'Un iPad que se presenta como Mac',
      detail: 'Tu User-Agent dice macOS, pero la pantalla es táctil. Es lo que hace Safari en iPad por defecto: pide las webs «de escritorio».',
    },

  // --- Protección ---
  ({ canvas }) => {
    if (!ok(canvas) || !canvas.blocked) return null;
    const d = canvas.details ?? {};
    const how = d.imagenVacia
      ? 'devuelve una imagen vacía'
      : d.ruidoAlExportar
        ? 'añade ruido al exportar la imagen'
        : d.ruidoAlLeerPixeles
          ? 'añade ruido al leer los píxeles'
          : 'no dibuja igual dos veces seguidas';
    return {
      kind: 'protection',
      severity: 'mid',
      title: 'Canvas protegido',
      detail: `Tu navegador ${how}. Así la huella de canvas cambia y no sirve para seguirte.`,
    };
  },

  ({ audio }) =>
    ok(audio) && audio.blocked && {
      kind: 'protection',
      severity: 'mid',
      title: 'Audio protegido',
      detail: 'La huella de audio sale distinta en cada pasada o en silencio: tu navegador la está alterando.',
    },

  ({ webgl }) =>
    ok(webgl) && webgl.details?.masked && {
      kind: 'protection',
      severity: 'low',
      title: 'Tarjeta gráfica enmascarada',
      detail: `Tu navegador solo dice «${webgl.raw.renderer}» en vez del modelo exacto.`,
    },

  ({ timerPrecision }) =>
    ok(timerPrecision) && timerPrecision.blocked && {
      kind: 'protection',
      severity: 'mid',
      title: 'Reloj degradado a propósito',
      detail: 'performance.now() avanza a saltos de 16 ms o más: típico de resistFingerprinting y Tor Browser.',
    },

  ({ antiFingerprinting }) =>
    ok(antiFingerprinting) && antiFingerprinting.raw.length > 0 && {
      kind: 'protection',
      severity: 'mid',
      title: 'Rastros de un navegador protegido',
      detail: `Hemos encontrado: ${antiFingerprinting.raw.join(', ')}.`,
    },
];

export function analyzeLies(results) {
  const signals = Object.fromEntries(results.map((r) => [r.id, r]));
  const ua = parseUserAgent(signals.userAgent?.raw);
  const findings = [];
  for (const check of CHECKS) {
    try {
      const finding = check(signals, ua);
      if (finding) findings.push(finding);
    } catch (err) {
      console.warn('Comprobación de coherencia fallida', err);
    }
  }

  const has = (kind) => findings.some((f) => f.kind === kind);
  let verdict;
  if (has('inconsistency') && findings.some((f) => f.kind === 'inconsistency' && f.severity !== 'low')) {
    verdict = { id: 'lies', title: 'Tu navegador miente en algo', text: 'Hay datos que se contradicen entre sí. Falsear señales sueltas suele hacerte más raro, no menos.' };
  } else if (has('automation')) {
    verdict = { id: 'bot', title: 'Esto parece un navegador automatizado', text: 'Las webs con sistemas anti-bots te tratarían con desconfianza.' };
  } else if (has('protection')) {
    verdict = { id: 'protected', title: 'Posible protección anti-fingerprinting detectada', text: 'Tu navegador está alterando o recortando algunas señales para que no te sigan.' };
  } else if (has('inconsistency')) {
    verdict = { id: 'minor', title: 'Pequeñas incoherencias', text: 'Nada grave, pero son detalles que un tracker también puede anotar.' };
  } else {
    verdict = { id: 'honest', title: 'Todo encaja', text: 'Tu navegador dice la verdad en todo. Eso es bueno para la compatibilidad… y también para quien quiera reconocerte.' };
  }
  return { ua, findings, verdict, checks: CHECKS.length };
}
