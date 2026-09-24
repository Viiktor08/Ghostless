import collectors from './collectors/index.js';
import { runCollectors } from './runner.js';
import { fingerprintHash } from './hash.js';
import { computeScore } from './scoring.js';
import { createScanConsole } from './ui/scan.js';
import { renderGauge } from './ui/gauge.js';
import { renderCategories, renderCategoryNav } from './ui/cards.js';
import { renderBreakdown, renderHash, renderScore, renderStats } from './ui/summary.js';
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
  howDialog: $('#how-dialog'),
};

// Peticiones de red hechas por la página desde un instante dado. Debe ser 0.
function networkRequestsSince(start) {
  return performance
    .getEntriesByType('resource')
    .filter((entry) => entry.startTime >= start && /^https?:/.test(entry.name)).length;
}

const scrollBehavior = () => (reducedMotion() ? 'auto' : 'smooth');

async function scan() {
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
  const score = computeScore(results);
  const stableCount = Object.keys(components).length;
  await terminal.finish({ hash, score, stableCount });

  const requests = networkRequestsSince(start);
  window.ghostless = { results, hash, components, requests, score: { bits: score.bits, level: score.level.id, perSignal: score.perSignal } };

  ui.results.hidden = false;
  renderScore(ui.results, score);
  renderHash(ui.results, hash, stableCount);
  renderStats(ui.results, {
    readable: results.filter((r) => r.supported && !r.error).length,
    total: results.length,
    protectedCount: results.filter((r) => r.blocked).length,
    requests,
  });
  renderBreakdown(ui.howDialog, score, results);
  renderCategoryNav(ui.nav, results);
  renderCategories(ui.categories, results, score);
  ui.results.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  ui.resultsTitle.focus({ preventScroll: true });
  renderGauge(ui.gauge, score);

  document.documentElement.dataset.scan = 'done';
  ui.scanButton.disabled = false;
  ui.rescanButton.disabled = false;
}

function setupDialog(dialog) {
  document.querySelectorAll('[data-open-how]').forEach((button) => {
    button.addEventListener('click', () => dialog.showModal());
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  // Cerrar al pulsar fuera del contenido.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

ui.scanButton.addEventListener('click', scan);
ui.rescanButton.addEventListener('click', scan);
setupDialog(ui.howDialog);
