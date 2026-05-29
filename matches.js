import { MatchesService } from './matches.service.js';
import { AdminService } from './admin.service.js';
import { store } from './store.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { formatDate, formatTime } from './helpers.js';
import { showToast } from './toast.js';

export default async function renderMatchesAdmin(container) {
  const { compId } = store.getState();
  try {
    const gw = await MatchesService.getActiveGameweek(compId);
    if (!gw) { setHTML(container, '<p style="text-align:center;padding:20px;color:var(--text-tertiary);">لا توجد جولة نشطة. فعّل جولة أولاً.</p>'); return; }

    const matches = await MatchesService.getMatchesByGameweek(gw.id);
    setHTML(container, `
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="admin-section-title">مباريات الجولة: ${esc(gw.name)}</div>
          <button class="btn-admin-action" id="btn-add-match">+ إضافة مباراة</button>
        </div>
        <div id="matches-list">
          ${matches.map(m => `
            <div class="admin-row">
              <div class="admin-row-info">
                <span class="admin-row-name">${esc(m.home_team)} vs ${esc(m.away_team)}</span>
                <span style="font-size:12px;color:var(--text-tertiary);">${esc(formatDate(m.match_date))} ${esc(formatTime(m.match_date))} — ${esc(m.status)}</span>
              </div>
              <div class="admin-row-actions">
                <button class="btn-admin-sm btn-danger" data-action="del" data-id="${m.id}">حذف</button>
              </div>
            </div>
          `).join('') || '<p style="text-align:center;padding:20px;color:var(--text-tertiary);">لا توجد مباريات</p>'}
        </div>
      </div>
    `);

    container.querySelector('#btn-add-match').addEventListener('click', () => {
      const home = prompt('الفريق الأول:');
      const away = prompt('الفريق الثاني:');
      const date = prompt('تاريخ ووقت المباراة (YYYY-MM-DD HH:MM):');
      if (!home || !away || !date) return;
      MatchesService.adminCreateMatch({ home_team: home, away_team: away, match_date: date, gameweek_id: gw.id, competition_id: compId, status: 'open' })
        .then(() => { showToast('تمت إضافة المباراة', 'success'); renderMatchesAdmin(container); })
        .catch(err => showToast(err.message, 'error'));
    });

    container.querySelectorAll('[data-action="del"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        try { await MatchesService.adminDeleteMatch(btn.dataset.id); showToast('تم الحذف', 'success'); await renderMatchesAdmin(container); }
        catch (err) { showToast(err.message, 'error'); }
      });
    });
  } catch (err) {
    setHTML(container, `<p style="color:var(--color-danger);padding:20px;">خطأ: ${esc(err.message)}</p>`);
  }
}
