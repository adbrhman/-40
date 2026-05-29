import { AdminService } from './admin.service.js';
import { MatchesService } from './matches.service.js';
import { store } from './store.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { showToast } from './toast.js';

export default async function renderRounds(container) {
  const { compId } = store.getState();
  try {
    const gws = await AdminService.getGameweeks(compId);
    setHTML(container, `
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="admin-section-title">الجولات</div>
          <button class="btn-admin-action" id="btn-add-gw">+ إضافة جولة</button>
        </div>
        <div id="gw-list">
          ${gws.length ? gws.map(gw => `
            <div class="admin-row" data-gw="${gw.id}">
              <div class="admin-row-info">
                <span class="admin-row-name">${esc(gw.name)}</span>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  ${gw.is_active ? '<span class="admin-badge active">نشطة</span>' : ''}
                  ${gw.is_calculated ? '<span class="admin-badge">محسوبة</span>' : ''}
                </div>
              </div>
              <div class="admin-row-actions">
                ${!gw.is_active ? `<button class="btn-admin-sm" data-action="activate" data-id="${gw.id}">تفعيل</button>` : ''}
                ${!gw.is_calculated ? `<button class="btn-admin-sm btn-success" data-action="calc" data-id="${gw.id}">احتساب</button>` : ''}
              </div>
            </div>
          `).join('') : '<p style="text-align:center;padding:20px;color:var(--text-tertiary);">لا توجد جولات بعد</p>'}
        </div>
      </div>
    `);

    container.querySelector('#btn-add-gw').addEventListener('click', async () => {
      const name = prompt('اسم الجولة:');
      if (!name) return;
      try {
        await AdminService.createGameweek({ name: name.trim(), competition_id: compId, is_active: false, is_calculated: false });
        showToast('تم إنشاء الجولة', 'success');
        await renderRounds(container);
      } catch (err) { showToast(err.message, 'error'); }
    });

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const id     = btn.dataset.id;
        try {
          if (action === 'activate') { await AdminService.setActiveGameweek(compId, id); showToast('تم تفعيل الجولة', 'success'); }
          if (action === 'calc')     { await AdminService.calculateRound(id); showToast('تم احتساب النقاط', 'success'); }
          await renderRounds(container);
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  } catch (err) {
    setHTML(container, `<p style="color:var(--color-danger);padding:20px;">خطأ: ${esc(err.message)}</p>`);
  }
}
