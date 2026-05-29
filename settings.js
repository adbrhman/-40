import { AdminService } from './admin.service.js';
import { MatchesService } from './matches.service.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { showToast } from './toast.js';

export default async function renderSettings(container) {
  try {
    const settings = await MatchesService.getSettings();
    setHTML(container, `
      <div class="admin-section">
        <div class="admin-section-title">الإعدادات العامة</div>
        <form id="settings-form" class="admin-settings-form">
          <div class="admin-setting-row">
            <label>نقاط التوقع الدقيق</label>
            <input type="number" id="s-pts-exact" value="${esc(settings.pts_exact || '3')}" min="1" max="10" />
          </div>
          <div class="admin-setting-row">
            <label>نقاط التوقع المضاعف</label>
            <input type="number" id="s-pts-double" value="${esc(settings.pts_double || '6')}" min="1" max="20" />
          </div>
          <div class="admin-setting-row">
            <label>تفعيل ميزة المضاعفة</label>
            <input type="checkbox" id="s-double-enabled" ${settings.double_enabled !== 'false' ? 'checked' : ''} />
          </div>
          <div class="admin-setting-row">
            <label>تفعيل التسجيل</label>
            <input type="checkbox" id="s-reg-enabled" ${settings.registration_enabled !== 'false' ? 'checked' : ''} />
          </div>
          <div class="admin-setting-row" style="flex-direction:column;align-items:flex-start;gap:8px;">
            <label>إشعار عام (يظهر لجميع المستخدمين)</label>
            <textarea id="s-global-notice" class="admin-textarea" maxlength="200">${esc(settings.global_notice || '')}</textarea>
          </div>
          <button type="submit" class="btn-primary btn-press" style="margin-top:16px;">💾 حفظ الإعدادات</button>
        </form>
      </div>
    `);

    container.querySelector('#settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await AdminService.updateSettings({
          pts_exact:              container.querySelector('#s-pts-exact').value,
          pts_double:             container.querySelector('#s-pts-double').value,
          double_enabled:         container.querySelector('#s-double-enabled').checked ? 'true' : 'false',
          registration_enabled:   container.querySelector('#s-reg-enabled').checked ? 'true' : 'false',
          global_notice:          container.querySelector('#s-global-notice').value.trim(),
        });
        showToast('تم حفظ الإعدادات', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
  } catch (err) {
    setHTML(container, `<p style="color:var(--color-danger);padding:20px;">خطأ: ${esc(err.message)}</p>`);
  }
}
