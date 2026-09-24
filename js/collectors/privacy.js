// Clases que las listas de filtros (EasyList y similares) ocultan siempre.
const BAIT_CLASSES = 'ad ads adsbox ad-banner ad-placeholder adbadge banner-ads pub_300x250 pub_728x90 text-ad textAd sponsored-ad';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default [
  {
    id: 'adBlock',
    category: 'privacy',
    name: 'Bloqueador de anuncios',
    async run() {
      const bait = document.createElement('div');
      bait.className = BAIT_CLASSES;
      bait.setAttribute('aria-hidden', 'true');
      bait.textContent = ' ';
      Object.assign(bait.style, { position: 'absolute', left: '-10000px', top: '0', width: '300px', height: '250px' });
      document.body.append(bait);
      try {
        await nextFrame();
        await wait(150);
        const style = getComputedStyle(bait);
        const hidden =
          !bait.isConnected ||
          bait.offsetHeight === 0 ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0';
        const value = hidden ? 'detectado: ha ocultado nuestro anuncio cebo' : 'no detectado (o no filtra anuncios cosméticos)';
        return { supported: true, value, raw: hidden };
      } finally {
        bait.remove();
      }
    },
  },
  {
    id: 'antiFingerprinting',
    category: 'privacy',
    name: 'Protección anti-fingerprinting',
    async run() {
      const signs = [];
      if (navigator.brave && (await navigator.brave.isBrave?.())) signs.push('Brave Shields');

      const isFirefox = /firefox/i.test(navigator.userAgent);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // resistFingerprinting (Firefox, Tor Browser) iguala la pantalla a la ventana y fija la hora en UTC.
      if (isFirefox && screen.width === window.innerWidth && screen.height === window.innerHeight) {
        signs.push('pantalla = ventana (resistFingerprinting)');
      }
      if (isFirefox && /^(UTC|Etc\/UTC|Atlantic\/Reykjavik)$/.test(timeZone)) signs.push('zona horaria forzada a UTC');
      // Tor Browser redondea la ventana a múltiplos de 200×100 ("letterboxing").
      if (isFirefox && window.innerWidth % 200 === 0 && window.innerHeight % 100 === 0) {
        signs.push('ventana en múltiplos de 200×100 (letterboxing de Tor)');
      }

      const value = signs.length ? signs.join(' · ') : 'ninguna evidente';
      return { supported: true, value, raw: signs };
    },
  },
];
