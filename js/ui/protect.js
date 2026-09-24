import { h } from './dom.js';
import { BROWSERS, GOLDEN_RULES } from '../data/protection.js';
import { parseUserAgent } from '../lies.js';

function detectBrowser() {
  if (navigator.brave) return 'brave';
  const ua = parseUserAgent(navigator.userAgent);
  if (ua.browser === 'Edge') return 'edge';
  if (ua.browser === 'Firefox') return 'firefox';
  if (ua.browser === 'Safari') return 'safari';
  return 'chrome';
}

// Pestañas accesibles: flechas, Inicio y Fin mueven entre navegadores.
export function renderProtect(root) {
  const current = detectBrowser();
  root.querySelector('[data-rules]').replaceChildren(...GOLDEN_RULES.map((rule) => h('li', null, rule)));

  const tabs = [];
  const panels = [];
  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
    });
    if (focus) tabs[index].focus();
  };

  BROWSERS.forEach((browser, i) => {
    const tabId = `tab-${browser.id}`;
    const panelId = `panel-${browser.id}`;
    tabs.push(
      h('button', {
        class: 'tab',
        type: 'button',
        role: 'tab',
        id: tabId,
        'aria-controls': panelId,
        onclick: () => select(i),
      }, browser.name, browser.id === current ? h('span', { class: 'tab-yours' }, 'el tuyo') : null),
    );
    panels.push(
      h('div', { class: 'tab-panel', role: 'tabpanel', id: panelId, 'aria-labelledby': tabId, tabindex: 0 },
        h('p', { class: 'protect-level' }, 'Protección de serie: ', h('strong', null, browser.level)),
        h('p', null, browser.summary),
        h('ol', { class: 'protect-tips' }, browser.tips.map((tip) => h('li', null, tip))),
      ),
    );
  });

  const tablist = h('div', { class: 'tablist', role: 'tablist', 'aria-label': 'Navegadores' }, tabs);
  tablist.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select((moves[event.key] + tabs.length) % tabs.length, true);
  });

  root.querySelector('[data-tabs]').replaceChildren(tablist, ...panels);
  select(Math.max(0, BROWSERS.findIndex((b) => b.id === current)));
}
