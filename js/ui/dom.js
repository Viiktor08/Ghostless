// Creación de nodos sin innerHTML: los textos siempre entran como nodos de
// texto, así un User-Agent o idioma manipulado nunca se interpreta como HTML.

const SVG_NS = 'http://www.w3.org/2000/svg';

function build(el, attrs, children) {
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.setAttribute('class', value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

export const h = (tag, attrs, ...children) => build(document.createElement(tag), attrs, children);

export const svg = (tag, attrs, ...children) => build(document.createElementNS(SVG_NS, tag), attrs, children);
