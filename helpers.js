const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                   'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${AR_DAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
}

export function formatTime(dateStr) {
  const d = new Date(dateStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = d.getHours() < 12 ? 'AM' : 'PM';
  return `${ampm} ${h}:${m}`;
}

export function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function getDayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
  if (isSameDay(d, today)) return 'اليوم';
  if (isSameDay(d, tomorrow)) return 'غداً';
  return AR_DAYS[d.getDay()];
}

export function getDayTabLabel(dateStr) {
  const d = new Date(dateStr);
  return {
    day: getDayLabel(dateStr) === 'اليوم' ? 'اليوم'
       : getDayLabel(dateStr) === 'غداً'  ? 'غداً'
       : AR_DAYS[d.getDay()],
    date: `${d.getDate()} ${AR_MONTHS[d.getMonth()]}`,
  };
}

export function groupMatchesByDay(matches) {
  const groups = new Map();
  for (const m of matches) {
    const key = new Date(m.match_date).toDateString();
    if (!groups.has(key)) groups.set(key, { dateStr: m.match_date, matches: [] });
    groups.get(key).matches.push(m);
  }
  return [...groups.values()].sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
}

export function getUniqueDays(matches) {
  const seen = new Set();
  const days = [];
  for (const m of matches) {
    const key = new Date(m.match_date).toDateString();
    if (!seen.has(key)) {
      seen.add(key);
      days.push({ key, dateStr: m.match_date });
    }
  }
  return days.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
}

export function isMatchOpen(match) {
  const now = Date.now();
  const start = new Date(match.match_date).getTime();
  return start > now && match.status === 'open';
}

export function getMatchVerdict(pred, match) {
  if (!pred || match.status !== 'finished') return 'open';
  const { home_score, away_score } = match;
  const { home_score: ph, away_score: pa } = pred;
  if (ph === home_score && pa === away_score) return 'exact';
  const actualResult = home_score > away_score ? 'H' : away_score > home_score ? 'A' : 'D';
  const predResult   = ph > pa ? 'H' : pa > ph ? 'A' : 'D';
  if (actualResult === predResult) return 'win';
  return 'wrong';
}

export function getVerdictLabel(verdict) {
  return { exact: 'توقع دقيق ✓', win: 'نتيجة صحيحة', draw: 'تعادل', wrong: 'خطأ', open: 'مفتوح' }[verdict] || '';
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, limit) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn(...args); }
  };
}

export async function withRetry(fn, maxAttempts = 3, baseDelay = 800) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt - 1)));
    }
  }
}

export function getAvatarFallback(name) {
  const initials = (name || 'U').slice(0, 2).toUpperCase();
  const colors = ['7c3aed', '2563eb', '059669', 'd97706', 'dc2626'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#${colors[idx]}"/><text x="50" y="62" font-family="Cairo,Arial" font-size="36" font-weight="800" text-anchor="middle" fill="white">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
