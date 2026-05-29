const SANITIZE_MAP = {
  '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#x27;', '%': '&#x25;', ';': '&#x3B;',
  '(': '&#x28;', ')': '&#x29;', '&': '&amp;', '+': '&#x2B;', '\\': '&#x5C;',
};

export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'%;()&+\\]/g, ch => SANITIZE_MAP[ch] || ch);
}

export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function safeId(val) {
  if (typeof val === 'number') return Number.isInteger(val) && val > 0 ? val : null;
  if (typeof val === 'string') {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)) return val;
    if (/^\d+$/.test(val)) {
      const n = parseInt(val, 10);
      return n > 0 ? n : null;
    }
  }
  return null;
}

export function safeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return url;
  } catch {
    return '';
  }
}

export function safeUsername(name) {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/[^a-zA-Z0-9\u0600-\u06FF_\- .]/g, '').slice(0, 32);
}

export function safeScore(val) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0 || n > 99) return null;
  return n;
}
