import { store } from './store.js';
import { PredictionService } from './prediction.service.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { getMatchVerdict, getVerdictLabel } from './helpers.js';

export async function renderHistory(contentEl) {
  setHTML(contentEl, '<div class="page-loader"><div class="spinner-ring"></div></div>');

  const { user, compId } = store.getState();
  if (!user || !compId) return;

  try {
    const history = await PredictionService.getHistory(user.id, compId);
    store.dispatch('SET_HIST', history);

    if (!history.length) {
      setHTML(contentEl, `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p class="empty-state-title">لا يوجد سجل بعد</p>
          <p class="empty-state-text">ستظهر هنا نتائج جولاتك السابقة</p>
        </div>
      `);
      return;
    }

    const frag = document.createDocumentFragment();

    for (const { round, predictions, totalPts } of history) {
      const card = document.createElement('div');
      card.className = 'hist-round-card';

      const predsHTML = predictions.map(p => {
        const match = p.matches;
        const verdict = getMatchVerdict(p, { ...match, status: 'finished' });
        return `
          <div class="hist-pred-row">
            <span class="hist-teams">${esc(match?.home_team || '؟')} vs ${esc(match?.away_team || '؟')}</span>
            <span class="hist-score-pred">${p.home_score ?? '?'} - ${p.away_score ?? '?'}</span>
            <span class="match-verdict verdict-${verdict}" style="font-size:11px;padding:2px 8px;">${getVerdictLabel(verdict)}</span>
          </div>
        `;
      }).join('');

      card.innerHTML = `
        <div class="hist-round-header" data-round="${esc(String(round.id))}">
          <span class="hist-round-name">${esc(round.name)}</span>
          <div class="hist-round-pts">
            <span class="hist-pts-val">${totalPts}</span>
            <span style="font-size:12px;color:var(--text-tertiary)">نقطة</span>
          </div>
        </div>
        <div class="hist-round-body">${predsHTML}</div>
      `;

      card.querySelector('.hist-round-header').addEventListener('click', function() {
        const body = card.querySelector('.hist-round-body');
        body.classList.toggle('open');
      });

      frag.append(card);
    }

    contentEl.replaceChildren(frag);

  } catch (err) {
    setHTML(contentEl, `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p class="empty-state-title">خطأ في تحميل السجل</p>
        <p class="empty-state-text">${esc(err.message)}</p>
      </div>
    `);
  }
}
