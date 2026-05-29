import { store } from './store.js';
import { MatchesService } from './matches.service.js';
import { PredictionService } from './prediction.service.js';
import { DayTabs } from './day-tabs.js';
import { MatchCard } from './match-card.js';
import { showToast } from './toast.js';
import { getUniqueDays, isMatchOpen } from './helpers.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';

let _dayTabs   = null;
let _cards     = new Map();
let _activeDay = null;
let _reqSym    = null;

export async function renderPredictions(contentEl, tabsEl) {
  const sym = Symbol();
  _reqSym = sym;

  setHTML(contentEl, '<div class="page-loader"><div class="spinner-ring"></div></div>');
  _setPredFooter(false);

  const { user, compId } = store.getState();
  if (!user || !compId) return;

  try {
    const gw = await MatchesService.getActiveGameweek(compId);
    if (sym !== _reqSym) return;

    if (!gw) {
      setHTML(contentEl, `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <p class="empty-state-title">لا توجد جولة نشطة</p>
          <p class="empty-state-text">انتظر حتى يفتح المشرف الجولة القادمة</p>
        </div>
      `);
      return;
    }

    const [matches, predictions] = await Promise.all([
      MatchesService.getMatchesByGameweek(gw.id),
      PredictionService.getPredictions(user.id, gw.id),
    ]);
    if (sym !== _reqSym) return;

    store.dispatch('SET_PRED', { gameweek: gw, matches, predictions });

    const draft = await PredictionService.restoreDraft(user.id, gw.id);
    let inputs   = {};
    let doubleId = null;

    if (draft) {
      inputs   = draft.inputs || {};
      doubleId = draft.doubleId;
    } else {
      for (const p of predictions) {
        inputs[p.match_id] = { home: p.home_score, away: p.away_score };
        if (p.is_double) doubleId = p.match_id;
      }
    }

    store.dispatch('SET_INPUTS', inputs);
    store.dispatch('SET_DOUBLE_ID', doubleId);

    if (!matches.length) {
      setHTML(contentEl, `
        <div class="empty-state">
          <div class="empty-state-icon">⚽</div>
          <p class="empty-state-title">لا توجد مباريات في هذه الجولة</p>
        </div>
      `);
      return;
    }

    if (!_dayTabs) {
      _dayTabs = new DayTabs(tabsEl, key => { _activeDay = key; _drawCards(contentEl, matches); });
    }
    _dayTabs.render(matches);

    const days = getUniqueDays(matches);
    if (!_activeDay || !days.find(d => d.key === _activeDay)) _activeDay = days[0]?.key || null;

    _drawCards(contentEl, matches);
    _setupSubmit(contentEl, user.id, gw.id, matches);
    _updateFooterUI(matches);

  } catch (err) {
    if (sym !== _reqSym) return;
    setHTML(contentEl, `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p class="empty-state-title">خطأ في التحميل</p>
        <p class="empty-state-text">${esc(err.message)}</p>
      </div>
    `);
  }
}

function _drawCards(contentEl, allMatches) {
  const { inputs, doubleId, pts, pred } = store.getState();
  const dayMatches = _activeDay
    ? allMatches.filter(m => new Date(m.match_date).toDateString() === _activeDay)
    : allMatches;

  if (!dayMatches.length) {
    setHTML(contentEl, '<div class="empty-state"><p class="empty-state-title">لا مباريات هذا اليوم</p></div>');
    return;
  }

  _cards.clear();
  const frag = document.createDocumentFragment();

  for (const match of dayMatches) {
    const card = new MatchCard({
      match,
      prediction: pred?.predictions?.find(p => p.match_id === match.id) || null,
      input:      inputs[match.id] || { home: null, away: null },
      isDouble:   String(doubleId) === String(match.id),
      pts,
      callbacks: {
        onScoreChange: (matchId, side, value) => {
          store.dispatch('UPDATE_SCORE_INPUT', { matchId, side, value });
          const s = store.getState();
          PredictionService.saveDraft(s.user.id, s.pred?.gameweek?.id, s.inputs, s.doubleId);
          _updateFooterUI(allMatches);
        },
        onDoubleToggle: matchId => {
          const prev = store.getState().doubleId;
          const next = prev === matchId ? null : matchId;
          store.dispatch('SET_DOUBLE_ID', next);
          for (const [id, c] of _cards) c.updateDouble(String(next) === id);
          const s = store.getState();
          PredictionService.saveDraft(s.user.id, s.pred?.gameweek?.id, s.inputs, next);
          _updateFooterUI(allMatches);
        },
      },
    });
    _cards.set(String(match.id), card);
    frag.append(card.element);
  }

  contentEl.replaceChildren(frag);
  _updateFooterUI(allMatches);
}

function _updateFooterUI(allMatches) {
  const { inputs, doubleEnabled } = store.getState();
  const open   = allMatches.filter(isMatchOpen);
  const filled = open.filter(m => { const i = inputs[m.id]; return i?.home !== null && i?.away !== null; });

  _setPredFooter(open.length > 0);

  const countEl = document.getElementById('pred-count-text');
  if (countEl) countEl.innerHTML = `تم ملء <strong>${filled.length}</strong> من <strong>${open.length}</strong> مباراة`;

  const submitBtn = document.getElementById('btn-submit-preds');
  if (submitBtn) {
    const allFilled = filled.length === open.length && open.length > 0;
    submitBtn.disabled = !allFilled;
    const submitText = document.getElementById('submit-btn-text');
    if (submitText) submitText.textContent = allFilled ? 'إرسال التوقعات 🚀' : 'أكمل التوقعات';
  }
}

function _setPredFooter(show) {
  const footer = document.getElementById('pred-footer');
  if (footer) footer.classList.toggle('hidden', !show);
}

function _setupSubmit(contentEl, userId, gwId, allMatches) {
  const btn = document.getElementById('btn-submit-preds');
  if (!btn) return;

  btn.onclick = async () => {
    const { inputs, doubleId } = store.getState();
    btn.disabled = true;
    const origText = document.getElementById('submit-btn-text')?.textContent;
    const submitText = document.getElementById('submit-btn-text');
    if (submitText) submitText.textContent = 'جاري الإرسال...';

    try {
      await PredictionService.submitPredictions(userId, gwId, inputs, doubleId);
      PredictionService.clearDraft(userId, gwId);
      showToast('تم إرسال توقعاتك بنجاح! 🎉', 'success');
      await renderPredictions(contentEl, document.getElementById('pred-day-tabs-container'));
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      if (submitText) submitText.textContent = origText || 'إرسال التوقعات';
    }
  };
}
