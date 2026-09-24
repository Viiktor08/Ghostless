import collectors from './collectors/index.js';
import { runCollectors } from './runner.js';
import { fingerprintHash, signalFingerprints } from './hash.js';
import { computeScore } from './scoring.js';
import { analyzeLies } from './lies.js';
import { buildExport } from './compare.js';
import { createScanConsole } from './ui/scan.js';
import { renderGauge } from './ui/gauge.js';
import { renderCategories, renderCategoryNav } from './ui/cards.js';
import { renderBreakdown, renderHash, renderScore, renderStats } from './ui/summary.js';
import { renderLies } from './ui/lies.js';
import { renderStability } from './ui/stability.js';
import { renderCompare } from './ui/compare.js';
import { setupShareDialog } from './ui/share.js';
import { renderProtect } from './ui/protect.js';
import { setupEasterEgg } from './ui/easter.js';
import { reducedMotion } from './ui/effects.js';

const $ = (selector) => document.querySelector(selector);

const ui = {
  scanButton: $('#scan-btn'),
  rescanButton: $('#rescan-btn'),
  scanSection: $('#scan'),
  results: $('#results'),
  resultsTitle: $('#results-title'),
  gauge: $('[data-gauge]'),
  nav: $('#category-nav'),
  categories: $('#categories'),
  lies: $('[data-lies]'),
  stability: $('[data-stability]'),
  compare: $('[data-compare]'),
  howDialog: $('#how-dialog'),
  shareDialog: $('#share-dialog'),
  eggDialog: $('#egg-dialog'),
  protect: $('#protect'),
};

// Resultado del último escaneo, compartido con los extras.
let state = null;
let scanning = false;

// Peticiones de red hechas por la página desde un instante dado. Debe ser 0.
function networkRequestsSince(start) {
  return performance
    .getEntriesByType('resource')
    .filter((entry) => entry.startTime >= start && /^https?:/.test(entry.name)).length;
}

const scrollBehavior = () => (reducedMotion() ? 'auto' : 'smooth');

const EXTRA_LINKS = [
  { href: '#lies', icon: '🕵️', label: 'Detector de mentiras' },
  { href: '#tools', icon: '🧪', label: 'Experimentos' },
  { href: '#protect', icon: '🛡️', label: 'Cómo protegerte' },
];

async function scan() {
  if (scanning) return;
  scanning = true;
  ui.scanButton.disabled = true;
  ui.rescanButton.disabled = true;
  document.documentElement.dataset.scan = 'running';
  ui.results.hidden = true;
  ui.scanSection.hidden = false;
  ui.scanSection.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });

  const start = performance.now();
  const terminal = createScanConsole(ui.scanSection, collectors.length);
  const results = await runCollectors(collectors, { onResult: terminal.push });
  const { hash, components } = await fingerprintHash(results);
  const fingerprints = await signalFingerprints(results);
  const score = computeScore(results);
  const lies = analyzeLies(results);
  const stableCount = Object.keys(components).length;
  await terminal.finish({ hash, score, stableCount });

  const requests = networkRequestsSince(start);
  const readable = results.filter((r) => r.supported && !r.error).length;
  const names = Object.fromEntries(results.map((r) => [r.id, r.name]));
  const stableSignals = Object.fromEntries(Object.keys(components).map((id) => [id, fingerprints[id]]));
  state = { results, hash, components, fingerprints, score, lies, requests, readable };
  window.ghostless = {
    results,
    hash,
    components,
    requests,
    score: { bits: score.bits, level: score.level.id, perSignal: score.perSignal },
    lies: { verdict: lies.verdict.id, findings: lies.findings },
  };

  ui.results.hidden = false;
  renderScore(ui.results, score);
  renderHash(ui.results, hash, stableCount);
  renderStats(ui.results, {
    readable,
    total: results.length,
    protectedCount: results.filter((r) => r.blocked).length,
    requests,
  });
  renderBreakdown(ui.howDialog, score, results);
  renderLies(ui.lies, lies);
  renderCategoryNav(ui.nav, results, EXTRA_LINKS);
  renderCategories(ui.categories, results, score);
  renderStability(ui.stability, { hash, signals: stableSignals }, names);
  renderCompare(ui.compare, buildExport({ results, hash, fingerprints, ua: lies.ua }));
  ui.results.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  ui.resultsTitle.focus({ preventScroll: true });
  renderGauge(ui.gauge, score);

  document.documentElement.dataset.scan = 'done';
  ui.scanButton.disabled = false;
  ui.rescanButton.disabled = false;
  scanning = false;
}

function setupDialog(dialog) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  // Cerrar al pulsar fuera del contenido.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

const openShare = setupShareDialog(ui.shareDialog, () => {
  const { lies } = state;
  return {
    bits: state.score.bits,
    level: state.score.level,
    oneIn: state.score.oneIn,
    hash: state.hash,
    readable: state.readable,
    requests: state.requests,
    browser: [lies.ua.browser, lies.ua.os].filter(Boolean).join(' · ') || 'navegador desconocido',
  };
});

ui.scanButton.addEventListener('click', scan);
ui.rescanButton.addEventListener('click', scan);
setupDialog(ui.howDialog);
document.querySelectorAll('[data-open-how]').forEach((button) => button.addEventListener('click', () => ui.howDialog.showModal()));
$('[data-share]').addEventListener('click', () => openShare());
renderProtect(ui.protect);
setupEasterEgg({ dialog: ui.eggDialog, getState: () => state, onScan: scan });
