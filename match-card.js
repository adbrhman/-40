import { formatTime, formatCountdown, isMatchOpen, getMatchVerdict, getVerdictLabel, getAvatarFallback } from './helpers.js';
import { esc } from './security.js';
import { batchDOM } from './renderer.js';

export class MatchCard {
  #el; #match; #prediction; #input; #isDouble; #pts; #callbacks; #countdownInterval;

  constructor({ match, prediction, input, isDouble, pts, callbacks }) {
    this.#match      = match;
    this.#prediction = prediction;
    this.#input      = input || { home: null, away: null };
    this.#isDouble   = isDouble || false;
    this.#pts        = pts || { exact: 3, double: 6 };
    this.#callbacks  = callbacks || {};
    this.#el = document.createElement('div');
    this.#el.dataset.matchId = match.id;
    this.#render();
  }

  get element() { return this.#el; }

  #getState() {
    const now  = Date.now();
    const start = new Date(this.#match.match_date).getTime();
    if (this.#match.status === 'finished') return 'result';
    if (this.#match.status === 'live')     return 'live';
    if (start <= now || this.#match.status === 'locked') return 'locked';
    return 'open';
  }

  #render() {
    const match  = this.#match;
    const state  = this.#getState();
    const verdict = state === 'result' ? getMatchVerdict(this.#prediction, match) : 'open';

    this.#el.className = ['match-card', `state-${state}`, this.#isDouble ? 'double-selected' : ''].filter(Boolean).join(' ');

    const isOpen   = state === 'open';
    const isResult = state === 'result';
    const isLive   = state === 'live';
    const homeDisp = this.#input.home !== null ? String(this.#input.home) : null;
    const awayDisp = this.#input.away !== null ? String(this.#input.away) : null;

    const homeLogoSrc = match.home_logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.home_team)}&background=1a1a2e&color=fff&size=64&bold=true`;
    const awayLogoSrc = match.away_logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.away_team)}&background=1a1a2e&color=fff&size=64&bold=true`;

    const countdownMs = new Date(match.match_date).getTime() - Date.now();
    const showCountdown = isOpen && countdownMs < 3_600_000 && countdownMs > 0;

    this.#el.innerHTML = `
      <div class="match-card-header">
        <div class="match-meta">
          <span class="match-time">${esc(formatTime(match.match_date))}</span>
          <span style="color:var(--border-default)">•</span>
          <span class="match-comp-name">${esc(match.comp_name || '')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${showCountdown ? `<span class="match-countdown" id="cdwn-${match.id}"></span>` : ''}
          <span class="match-status-dot${isLive ? ' live' : ''}"></span>
        </div>
      </div>
      <div class="match-card-body">
        <div class="match-team">
          <div class="team-logo-wrap">
            <img class="team-logo" src="${esc(homeLogoSrc)}" alt="${esc(match.home_team)}" onerror="this.src='${getAvatarFallback(match.home_team)}'" loading="lazy" />
            ${this.#isDouble ? '<span class="double-badge">×2</span>' : ''}
          </div>
          <span class="team-name">${esc(match.home_team)}</span>
        </div>
        ${isResult ? this.#renderResult(match, verdict) : this.#renderControls(homeDisp, awayDisp, !isOpen)}
        <div class="match-team">
          <div class="team-logo-wrap">
            <img class="team-logo" src="${esc(awayLogoSrc)}" alt="${esc(match.away_team)}" onerror="this.src='${getAvatarFallback(match.away_team)}'" loading="lazy" />
          </div>
          <span class="team-name">${esc(match.away_team)}</span>
        </div>
      </div>
      ${!isResult ? `
        <div class="match-card-footer">
          <button class="btn-double${this.#isDouble ? ' is-double' : ''}" data-action="double" ${!isOpen ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${this.#isDouble ? 'إلغاء الديل ⭐' : 'اختيرها كديل ⭐'}
          </button>
          ${isLive ? '<span class="match-lock-indicator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> مباشر</span>'
          : !isOpen ? '<span class="match-lock-indicator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> مقفل</span>' : ''}
        </div>
      ` : `
        <div class="match-card-footer" style="justify-content:center;">
          <span class="match-verdict verdict-${verdict}">${getVerdictLabel(verdict)}</span>
          ${this.#prediction?.is_double ? '<span class="match-verdict" style="margin-right:8px;background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.3);color:var(--color-gold);">×2 مضاعفة</span>' : ''}
        </div>
      `}
    `;

    this.#attachListeners();
    if (showCountdown) this.#startCountdown(countdownMs);
  }

  #renderControls(homeDisp, awayDisp, disabled) {
    const dis = disabled ? ' disabled' : '';
    const homeCls = `score-display${homeDisp !== null ? ' has-value' : ' score-unknown'}`;
    const awayCls = `score-display${awayDisp !== null ? ' has-value' : ' score-unknown'}`;
    return `
      <div class="match-score-controls">
        <div class="score-col">
          <button class="score-btn"${dis} data-action="inc" data-side="home" aria-label="زيادة">+</button>
          <div class="${homeCls}" id="score-home-${this.#match.id}">${homeDisp !== null ? homeDisp : '?'}</div>
          <button class="score-btn"${dis} data-action="dec" data-side="home" aria-label="نقصان">−</button>
        </div>
        <div class="score-col">
          <button class="score-btn"${dis} data-action="inc" data-side="away" aria-label="زيادة">+</button>
          <div class="${awayCls}" id="score-away-${this.#match.id}">${awayDisp !== null ? awayDisp : '?'}</div>
          <button class="score-btn"${dis} data-action="dec" data-side="away" aria-label="نقصان">−</button>
        </div>
      </div>
    `;
  }

  #renderResult(match, verdict) {
    return `
      <div class="match-result-score">
        <span class="result-score-num">${match.home_score ?? '?'}</span>
        <span class="result-score-sep">-</span>
        <span class="result-score-num">${match.away_score ?? '?'}</span>
      </div>
    `;
  }

  #attachListeners() {
    this.#el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const side   = btn.dataset.side;

      if ((action === 'inc' || action === 'dec') && !btn.disabled) {
        const current = (side === 'home' ? this.#input.home : this.#input.away) ?? 0;
        const next = action === 'inc' ? current + 1 : Math.max(0, current - 1);
        if (side === 'home') this.#input.home = next;
        else                 this.#input.away = next;
        this.#callbacks.onScoreChange?.(this.#match.id, side, next);
        this.#updateScoreDisplay(side, next);
      }

      if (action === 'double') this.#callbacks.onDoubleToggle?.(this.#match.id);
    });
  }

  #updateScoreDisplay(side, value) {
    const el = this.#el.querySelector(`#score-${side}-${this.#match.id}`);
    if (!el) return;
    batchDOM(() => {
      el.textContent = String(value);
      el.className = 'score-display has-value score-updated';
      setTimeout(() => el.classList.remove('score-updated'), 600);
    });
  }

  #startCountdown(initialMs) {
    const el = this.#el.querySelector(`#cdwn-${this.#match.id}`);
    if (!el) return;
    let remaining = initialMs;
    el.textContent = formatCountdown(remaining);
    this.#countdownInterval = setInterval(() => {
      remaining -= 1000;
      if (remaining <= 0) { clearInterval(this.#countdownInterval); el.textContent = ''; this.#render(); return; }
      el.textContent = formatCountdown(remaining);
    }, 1000);
  }

  updateInput(input) {
    this.#input = input;
    batchDOM(() => {
      const homeEl = this.#el.querySelector(`#score-home-${this.#match.id}`);
      const awayEl = this.#el.querySelector(`#score-away-${this.#match.id}`);
      if (homeEl) { homeEl.textContent = input.home !== null ? String(input.home) : '?'; homeEl.className = `score-display${input.home !== null ? ' has-value' : ' score-unknown'}`; }
      if (awayEl) { awayEl.textContent = input.away !== null ? String(input.away) : '?'; awayEl.className = `score-display${input.away !== null ? ' has-value' : ' score-unknown'}`; }
    });
  }

  updateDouble(isDouble) {
    if (this.#isDouble === isDouble) return;
    this.#isDouble = isDouble;
    this.#el.classList.toggle('double-selected', isDouble);
    const doubleBtn = this.#el.querySelector('[data-action="double"]');
    if (doubleBtn) {
      doubleBtn.classList.toggle('is-double', isDouble);
      doubleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${isDouble ? 'إلغاء الديل ⭐' : 'اختيرها كديل ⭐'}`;
    }
  }
}
