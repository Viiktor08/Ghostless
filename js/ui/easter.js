import { h } from './dom.js';
import { formatBits } from './format.js';

// Terminal secreta: se abre con el código Konami o escribiendo "help" en la
// página. Permite curiosear los datos crudos del último escaneo.

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const WORD = 'help';

const GHOST = [
  '   .-"""-.   ',
  '  /  o o  \\  ',
  ' |    ^    | ',
  ' |  \\___/  | ',
  ' |         | ',
  " '^~^~^~^~^' ",
];

const COMMANDS = {
  help: 'lista de órdenes',
  whoami: 'quién eres, según tu navegador',
  neofetch: 'resumen con estilo',
  hash: 'tu huella completa',
  ls: 'lista de señales leídas',
  'cat <señal>': 'datos en crudo de una señal (p. ej. cat canvas)',
  mentiras: 'resultado del detector de mentiras',
  bits: 'las señales que más te delatan',
  scan: 'escanear (o volver a escanear)',
  clear: 'limpiar la pantalla',
  exit: 'cerrar la terminal',
};

const ALIASES = { ayuda: 'help', '/help': 'help', lies: 'mentiras', señales: 'ls', salir: 'exit', q: 'exit', cls: 'clear', top: 'bits' };

export function setupEasterEgg({ dialog, getState, onScan }) {
  const output = dialog.querySelector('[data-egg-output]');
  const input = dialog.querySelector('[data-egg-input]');
  const history = [];
  let historyIndex = 0;

  const print = (text, cls) => {
    output.append(h('div', { class: `egg-line ${cls ?? ''}` }, text));
    output.scrollTop = output.scrollHeight;
  };
  const printBlock = (text, cls) => {
    output.append(h('pre', { class: `egg-block ${cls ?? ''}` }, text));
    output.scrollTop = output.scrollHeight;
  };

  const needsScan = () => {
    if (getState()) return false;
    print('Aún no hay datos. Escribe «scan» para escanear tu navegador.', 'is-warn');
    return true;
  };

  const run = {
    help() {
      printBlock(Object.entries(COMMANDS).map(([cmd, text]) => `${cmd.padEnd(14)} ${text}`).join('\n'));
    },
    whoami() {
      if (needsScan()) return;
      const { lies, score, hash } = getState();
      const { ua } = lies;
      print(`Eres ${[ua.browser, ua.major].filter(Boolean).join(' ') || 'un navegador misterioso'} en ${ua.os ?? 'un sistema desconocido'}.`);
      print(`Para cualquier web eres ${hash.slice(0, 16)}… · ${formatBits(score.bits)} bits · ${score.level.label.toLowerCase()}.`);
    },
    neofetch() {
      if (needsScan()) return;
      const { lies, score, hash, results } = getState();
      const get = (id) => results.find((r) => r.id === id);
      const value = (id) => (get(id)?.supported && !get(id)?.error ? String(get(id).value) : 'n/d');
      const info = [
        `visitante@${lies.ua.browser?.toLowerCase().replace(/\s+/g, '-') ?? 'web'}`,
        '-----------------------',
        `Sistema:   ${lies.ua.os ?? 'n/d'}`,
        `GPU:       ${value('webgl').slice(0, 48)}`,
        `Pantalla:  ${value('screen')}`,
        `CPU:       ${value('hardwareConcurrency')}`,
        `Zona:      ${value('timezone')}`,
        `Idiomas:   ${value('languages').slice(0, 48)}`,
        `Fuentes:   ${value('fonts').split(' · ')[0]}`,
        `Huella:    ${hash.slice(0, 24)}…`,
        `Unicidad:  ${formatBits(score.bits)} bits (${score.level.label.toLowerCase()})`,
      ];
      const rows = Math.max(GHOST.length, info.length);
      const lines = [];
      for (let i = 0; i < rows; i++) lines.push(`${GHOST[i] ?? ' '.repeat(GHOST[0].length)}  ${info[i] ?? ''}`);
      printBlock(lines.join('\n'), 'is-accent');
    },
    hash() {
      if (needsScan()) return;
      print(getState().hash, 'is-accent');
    },
    ls() {
      if (needsScan()) return;
      const lines = getState().results.map((r) => {
        const status = r.error ? 'ERR' : !r.supported ? ' - ' : r.blocked ? ' ! ' : ' ok';
        return `[${status}] ${r.id.padEnd(22)} ${r.name}`;
      });
      printBlock(lines.join('\n'));
    },
    cat(arg) {
      if (needsScan()) return;
      if (!arg) {
        print('Uso: cat <señal>. Escribe «ls» para ver los nombres.', 'is-warn');
        return;
      }
      const result = getState().results.find((r) => r.id.toLowerCase() === arg.toLowerCase());
      if (!result) {
        print(`cat: ${arg}: no existe esa señal`, 'is-error');
        return;
      }
      const { preview, ...rest } = result;
      const text = JSON.stringify(rest, null, 2);
      printBlock(text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text);
    },
    mentiras() {
      if (needsScan()) return;
      const { verdict, findings } = getState().lies;
      print(verdict.title, 'is-accent');
      if (!findings.length) print('Sin hallazgos.');
      for (const f of findings) print(`· [${f.kind}] ${f.title}`);
    },
    bits() {
      if (needsScan()) return;
      const { score, results } = getState();
      const names = Object.fromEntries(results.map((r) => [r.id, r.name]));
      printBlock(
        score.ranked
          .slice(0, 10)
          .map((r, i) => `${String(i + 1).padStart(2)}. ${(names[r.id] ?? r.id).padEnd(30)} ${formatBits(r.bits).padStart(4)} bits → aporta ${formatBits(r.contribution)}`)
          .join('\n'),
      );
    },
    scan() {
      dialog.close();
      onScan();
    },
    clear() {
      output.replaceChildren();
    },
    exit() {
      dialog.close();
    },
  };

  function execute(line) {
    const trimmed = line.trim();
    print(`$ ${trimmed}`, 'is-command');
    if (!trimmed) return;
    const [rawCommand, ...args] = trimmed.split(/\s+/);
    const command = ALIASES[rawCommand.toLowerCase()] ?? rawCommand.toLowerCase();
    if (command === 'sudo') print('Buen intento. Aquí nadie tiene permisos… ni siquiera nosotros.', 'is-warn');
    else if (command === 'rm') print('Nada que borrar: esta página no guarda nada tuyo (salvo que actives el test de estabilidad).', 'is-warn');
    else if (command === 'echo') print(args.join(' '));
    else if (run[command]) run[command](args.join(' '));
    else print(`orden no encontrada: ${rawCommand}. Escribe «help».`, 'is-error');
  }

  // Autocompleta órdenes y, tras "cat ", nombres de señales.
  function complete(value) {
    const catMatch = value.match(/^cat\s+(\S*)$/i);
    const pool = catMatch ? (getState()?.results.map((r) => r.id) ?? []) : Object.keys(run);
    const prefix = catMatch ? catMatch[1] : value.trim();
    const matches = pool.filter((item) => item.toLowerCase().startsWith(prefix.toLowerCase()));
    if (matches.length === 1) return catMatch ? `cat ${matches[0]}` : `${matches[0]} `;
    if (matches.length > 1) print(matches.join('  '));
    return value;
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const line = input.value;
      if (line.trim()) history.push(line);
      historyIndex = history.length;
      input.value = '';
      execute(line);
    } else if (event.key === 'ArrowUp' && history.length) {
      event.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex];
    } else if (event.key === 'ArrowDown' && history.length) {
      event.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] ?? '';
    } else if (event.key === 'Tab') {
      event.preventDefault();
      input.value = complete(input.value);
    }
  });

  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());

  function open() {
    if (dialog.open) return;
    output.replaceChildren();
    print('ghostless — terminal secreta. Escribe «help» para ver las órdenes.', 'is-accent');
    dialog.showModal();
    input.focus();
  }

  // Detector del código Konami y de la palabra mágica.
  let konamiStep = 0;
  let typed = '';
  document.addEventListener('keydown', (event) => {
    if (dialog.open || event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const key = event.key.toLowerCase();
    konamiStep = key === KONAMI[konamiStep] ? konamiStep + 1 : key === KONAMI[0] ? 1 : 0;
    if (event.key.length === 1) typed = (typed + key).slice(-WORD.length);
    if (konamiStep === KONAMI.length || typed === WORD) {
      konamiStep = 0;
      typed = '';
      event.preventDefault();
      open();
    }
  });

  console.info('%c👻 ¿Curioseando el código? Escribe «help» en la página (o prueba ↑↑↓↓←→←→BA).', 'color:#22d3ee;font-weight:bold');
  return { open };
}
