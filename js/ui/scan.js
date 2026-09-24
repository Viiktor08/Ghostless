import { h } from './dom.js';
import { decrypt, reducedMotion, sleep } from './effects.js';
import { formatBits } from './format.js';

// Pausa entre líneas: los collectors acaban en ~2 s, pero se muestran con
// ritmo de "escaneo" para que dé tiempo a leerlos.
const LINE_DELAY = 110;

const TAGS = {
  ok: { text: '[ OK ]', cls: 'is-ok' },
  na: { text: '[ -- ]', cls: 'is-na' },
  blocked: { text: '[ !! ]', cls: 'is-blocked' },
  error: { text: '[FAIL]', cls: 'is-error' },
};

export function statusOf(result) {
  if (result.error) return 'error';
  if (!result.supported) return 'na';
  if (result.blocked) return 'blocked';
  return 'ok';
}

export function createScanConsole(root, total) {
  const body = root.querySelector('[data-terminal]');
  const bar = root.querySelector('[data-progress-bar]');
  const count = root.querySelector('[data-progress-count]');
  const live = root.querySelector('[data-scan-live]');
  const skipButton = root.querySelector('[data-skip]');

  const queue = [];
  const cursor = h('span', { class: 'cursor', 'aria-hidden': 'true' });
  let shown = 0;
  let skipping = reducedMotion();
  let draining = null;
  let booted;

  body.replaceChildren();
  bar.style.width = '0%';
  count.textContent = `0/${total}`;
  skipButton.hidden = skipping;
  skipButton.onclick = () => {
    skipping = true;
    skipButton.hidden = true;
  };

  const pause = (ms) => (skipping ? Promise.resolve() : sleep(ms));

  function print(...children) {
    const line = h('div', { class: 'term-line' }, ...children);
    line.append(cursor);
    body.append(line);
    body.scrollTop = body.scrollHeight;
    return line;
  }

  const prompt = () => h('span', { class: 'term-prompt' }, '$');

  function updateProgress() {
    bar.style.width = `${Math.round((shown / total) * 100)}%`;
    count.textContent = `${shown}/${total}`;
    if (shown % 10 === 0 || shown === total) live.textContent = `Escaneando: ${shown} de ${total} señales leídas.`;
  }

  function show(result) {
    const status = statusOf(result);
    const tag = TAGS[status];
    const value = h('span', { class: 'term-value' });
    print(
      h('span', { class: `term-tag ${tag.cls}` }, tag.text),
      h('span', { class: 'term-name' }, result.name),
      h('span', { class: 'term-dots' }),
      value,
    );
    let text = String(result.value ?? '');
    if (status === 'na') text = 'no disponible';
    if (status === 'error') text = result.error;
    text = text.slice(0, 120);
    if (skipping) value.textContent = text;
    else decrypt(value, text, 280);
    shown += 1;
    updateProgress();
  }

  async function drain() {
    await booted;
    while (queue.length) {
      show(queue.shift());
      await pause(LINE_DELAY);
    }
    draining = null;
  }

  booted = (async () => {
    print(prompt(), 'ghostless --scan --sin-permisos');
    await pause(350);
    print(`Lanzando ${total} sondas · 0 cookies · 0 permisos · 0 peticiones`);
    await pause(350);
  })();

  return {
    push(result) {
      queue.push(result);
      draining ??= drain();
    },

    async finish({ hash, score, stableCount }) {
      await booted;
      while (draining) await draining;
      print(prompt(), `sha256 --señales-estables=${stableCount}`);
      await pause(300);
      const hashEl = h('span', { class: 'term-hash' });
      print('huella  → ', hashEl);
      if (skipping) hashEl.textContent = hash;
      else await decrypt(hashEl, hash, 800);
      print(`unicidad → ≈ ${formatBits(score.bits)} bits · ${score.level.label.toLowerCase()} (estimación)`);
      print(h('span', { class: 'term-done' }, 'Escaneo completo.'), ' Nada ha salido de tu navegador.');
      live.textContent = 'Escaneo completado. Mostrando resultados.';
      skipButton.hidden = true;
      await pause(900);
    },
  };
}
