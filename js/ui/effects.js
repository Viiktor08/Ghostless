export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GLYPHS = 'abcdef0123456789#%&*+=<>/\\|';

// Texto que se "descifra" letra a letra.
export function decrypt(el, text, duration = 450) {
  if (reducedMotion() || !text) {
    el.textContent = text;
    return Promise.resolve();
  }
  const start = performance.now();
  return new Promise((resolve) => {
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const fixed = Math.floor(text.length * progress);
      let out = text.slice(0, fixed);
      for (let i = fixed; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

// Anima un número de 0 a `to`, llamando a `render` en cada frame.
export function countUp(to, render, duration = 1400) {
  if (reducedMotion()) {
    render(to, 1);
    return Promise.resolve();
  }
  const start = performance.now();
  return new Promise((resolve) => {
    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      render(to * eased, eased);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
