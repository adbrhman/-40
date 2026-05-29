export function html(strings, ...values) {
  const raw = strings.reduce((acc, str, i) => {
    const val = values[i - 1];
    if (val === undefined || val === null || val === false) return acc + str;
    return acc + String(val) + str;
  });
  return strings.raw ? raw : raw;
}

export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') el.className = val;
    else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val);
    else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (val !== null && val !== undefined && val !== false) el.setAttribute(key, val);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    if (typeof child === 'string') el.append(document.createTextNode(child));
    else if (child instanceof Node) el.append(child);
  }
  return el;
}

export function setHTML(container, htmlString) {
  const frag = document.createRange().createContextualFragment(htmlString);
  container.replaceChildren(frag);
}

export function appendHTML(container, htmlString) {
  const frag = document.createRange().createContextualFragment(htmlString);
  container.append(frag);
}

export function renderList(container, items, renderFn, emptyEl = null) {
  if (!items?.length) {
    container.replaceChildren(emptyEl || document.createTextNode(''));
    return;
  }
  const frag = document.createDocumentFragment();
  for (const item of items) {
    const el = renderFn(item);
    if (el) frag.append(el);
  }
  container.replaceChildren(frag);
}

export function updateList(container, items, renderFn, keyFn) {
  const existing = new Map();
  for (const child of container.children) {
    const key = child.dataset.key;
    if (key) existing.set(key, child);
  }
  const frag = document.createDocumentFragment();
  const used = new Set();
  for (const item of items) {
    const key = String(keyFn(item));
    used.add(key);
    if (existing.has(key)) {
      frag.append(existing.get(key));
    } else {
      const el = renderFn(item);
      if (el) { el.dataset.key = key; frag.append(el); }
    }
  }
  for (const [key, el] of existing) {
    if (!used.has(key)) el.remove();
  }
  container.append(frag);
}

let _rafQueue = [];
let _rafScheduled = false;

export function batchDOM(fn) {
  _rafQueue.push(fn);
  if (!_rafScheduled) {
    _rafScheduled = true;
    requestAnimationFrame(() => {
      const fns = _rafQueue.splice(0);
      _rafScheduled = false;
      for (const f of fns) {
        try { f(); } catch (err) { console.error('[renderer] batchDOM error:', err); }
      }
    });
  }
}

export function lazyImage(imgEl, src, fallbackSrc) {
  if (!src) { imgEl.src = fallbackSrc || ''; return; }
  imgEl.src = src;
  imgEl.onerror = () => {
    if (fallbackSrc && imgEl.src !== fallbackSrc) {
      imgEl.src = fallbackSrc;
    }
  };
}
