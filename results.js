import { MatchesService } from './matches.service.js';
import { store } from './store.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { showToast } from './toast.js';

export default async function renderResults(container) {
  const { compId } = store.getState();
  try {
    const gw = await MatchesService.getActiveGameweek(compId);
    if (!gw) { setHTML(container, '<p style="text-align:center;padding:20px;color:var(--text-tertiary);">لا توجد جولة نشطة.</p>'); return; }
    const matches = await MatchesService.getMatchesByGameweek(gw.id);

    setHTML(container, `
      <div class="admin-section">
        <div class="admin-section-title">إدخال نتائج الجولة: ${esc(gw.name)}</div>
        <div id="results-list">
          ${matches.map(m => `
            <div class="admin-row">
              <div class="admin-row-info">
                <span class="admin-row-name">${esc(m.home_team)} vs ${esc(m.away_team)}</span>
                ${m.status === 'finished' ? `<span style="color:var(--color-success);font-size:12px;">النتيجة: ${m.home_score} - ${m.away_score}</span>` : ''}
              </div>
              <div class="admin-row-actions">
                <input type="number" class="admin-score-inp" placeholder="د" min="0" max="30" data-side="home" data-id="${m.id}" value="${m.home_score ?? ''}" style="width:56px;" />
                <span>-</span>
                <input type="number" class="admin-score-inp" placeholder="ض" min="0" max="30" data-side="away" data-id="${m.id}" value="${m.away_score ?? ''}" style="width:56px;" />
                <button class="btn-admin-sm btn-success" data-action="save-result" data-id="${m.id}">حفظ</button>
              </div>
            </div>
          `).join('') || '<p style="text-align:center;padding:20px;color:var(--text-tertiary);">لا توجد مباريات</p>'}
        </div>
      </div>
    `);

    container.querySelectorAll('[data-action="save-result"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id   = btn.dataset.id;
        const homeInp = container.querySelector(`input[data-side="home"][data-id="${id}"]`);
        const awayInp = container.querySelector(`input[data-side="away"][data-id="${id}"]`);
        const h = parseInt(homeInp.value), a = parseInt(awayInp.value);
        if (isNaN(h) || isNaN(a)) { showToast('أدخل النتيجتين', 'error'); return; }
        try { await MatchesService.adminSetResult(id, h, a); showToast('تم حفظ النتيجة', 'success'); await renderResults(container); }
        catch (err) { showToast(err.message, 'error'); }
      });
    });
  } catch (err) {
    setHTML(container, `<p style="color:var(--color-danger);padding:20px;">خطأ: ${esc(err.message)}</p>`);
  }
}
