import { store } from './store.js';
import { AuthService } from './auth.service.js';
import { StorageService } from './storage.service.js';
import { showToast } from './toast.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { getAvatarFallback } from './helpers.js';

export async function renderProfile(contentEl) {
  const { user } = store.getState();
  if (!user) return;

  setHTML(contentEl, `
    <div class="profile-hero">
      <div class="profile-bg"></div>
      <div class="profile-avatar-wrap">
        <div class="profile-avatar-ring">
          <img id="profile-avatar-img" class="profile-avatar"
               src="${esc(user.avatar_url || getAvatarFallback(user.display_name))}"
               onerror="this.src='${getAvatarFallback(user.display_name)}'" />
          <label class="profile-cam-btn" for="profile-file-input" title="تغيير الصورة">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </label>
          <input type="file" id="profile-file-input" accept="image/jpeg,image/png,image/webp" style="display:none" />
        </div>
        <h2 class="profile-username">${esc(user.display_name)}</h2>
        ${user.title ? `<span class="profile-title-badge">⭐ ${esc(user.title)}</span>` : ''}
      </div>
    </div>

    <div class="profile-stats-row">
      <div class="profile-stat-card">
        <span class="stat-icon">🎯</span>
        <span class="stat-value">${user.total_points || 0}</span>
        <span class="stat-label">نقطة</span>
      </div>
      <div class="profile-stat-card">
        <span class="stat-icon">⚡</span>
        <span class="stat-value">${user.accuracy ? Math.round(user.accuracy) + '%' : '—'}</span>
        <span class="stat-label">دقة التوقع</span>
      </div>
      <div class="profile-stat-card">
        <span class="stat-icon">🏆</span>
        <span class="stat-value">${user.level || 1}</span>
        <span class="stat-label">المستوى</span>
      </div>
    </div>

    <div class="profile-section">
      <p class="profile-section-title">معلومات الحساب</p>
      <div class="profile-edit-row" id="edit-name-row">
        <div class="edit-row-left">
          <div class="edit-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <span class="edit-row-label">الاسم</span>
        </div>
        <span class="edit-row-value">${esc(user.display_name)}</span>
      </div>
      <div class="profile-edit-row" id="change-pass-row">
        <div class="edit-row-left">
          <div class="edit-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <span class="edit-row-label">كلمة المرور</span>
        </div>
        <span class="edit-row-value">تغيير</span>
      </div>
    </div>

    <button class="btn-logout" id="btn-logout">تسجيل الخروج</button>
  `);

  contentEl.querySelector('#profile-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { user } = store.getState();
    try {
      showToast('جاري رفع الصورة...', 'info');
      const url = await StorageService.uploadAvatar(user.id, file);
      await AuthService.updateProfile(user.id, { avatar_url: url });
      const updated = await AuthService.loadUserProfile(user.id);
      store.dispatch('SET_USER', updated);
      contentEl.querySelector('#profile-avatar-img').src = url;
      const headerAvatar = document.getElementById('header-avatar');
      if (headerAvatar) headerAvatar.src = url;
      showToast('تم تحديث الصورة الشخصية', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  contentEl.querySelector('#btn-logout').addEventListener('click', async () => {
    await AuthService.logout();
  });
}
