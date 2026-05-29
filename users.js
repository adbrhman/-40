import { AdminService } from './admin.service.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { showToast } from './toast.js';
import { getAvatarFallback } from './helpers.js';

export default async function renderUsers(container) {
  try {
    const users = await AdminService.getUsers();
    setHTML(container, `
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="admin-section-title">المستخدمون (${users.length})</div>
          <input type="text" id="search-users" placeholder="بحث..." class="admin-search-inp" />
        </div>
        <div id="users-list">
          ${users.map(u => `
            <div class="admin-row">
              <img src="${esc(u.avatar_url || getAvatarFallback(u.display_name))}" class="admin-user-avatar" onerror="this.src='${getAvatarFallback(u.display_name)}'" />
              <div class="admin-row-info">
                <span class="admin-row-name">${esc(u.display_name)}</span>
                <span style="font-size:12px;color:var(--text-tertiary);">${esc(u.username || '')} ${u.is_admin ? '• 👑 مشرف' : ''}</span>
              </div>
              <div class="admin-row-actions">
                <span class="admin-badge${u.status === 'active' ? ' active' : ' suspended'}">${u.status === 'active' ? 'نشط' : 'موقوف'}</span>
                ${u.status === 'active'
                  ? `<button class="btn-admin-sm btn-danger" data-action="suspend" data-id="${esc(String(u.id))}">إيقاف</button>`
                  : `<button class="btn-admin-sm btn-success" data-action="activate" data-id="${esc(String(u.id))}">تفعيل</button>`}
              </div>
            </div>
          `).join('') || '<p style="text-align:center;padding:20px;color:var(--text-tertiary);">لا يوجد مستخدمون</p>'}
        </div>
      </div>
    `);

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const id     = btn.dataset.id;
        try {
          if (action === 'suspend')  await AdminService.suspendUser(id);
          if (action === 'activate') await AdminService.activateUser(id);
          showToast('تم تحديث المستخدم', 'success');
          await renderUsers(container);
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  } catch (err) {
    setHTML(container, `<p style="color:var(--color-danger);padding:20px;">خطأ: ${esc(err.message)}</p>`);
  }
}
