import collectors from './collectors/index.js';
import { runCollectors } from './runner.js';
import { fingerprintHash } from './hash.js';

const button = document.getElementById('scan-btn');
const status = document.getElementById('status');
const out = document.getElementById('out');

async function scan() {
  button.disabled = true;
  document.documentElement.dataset.scan = 'running';
  let done = 0;
  const results = await runCollectors(collectors, {
    onResult: (r) => {
      done += 1;
      status.textContent = `[${done}/${collectors.length}] ${r.name}`;
    },
  });
  const { hash, components } = await fingerprintHash(results);

  window.ghostless = { results, hash, components };
  status.textContent = `Huella: ${hash}`;
  out.textContent = JSON.stringify({ hash, results }, null, 2);
  document.documentElement.dataset.scan = 'done';
  button.disabled = false;
}

button.addEventListener('click', scan);
