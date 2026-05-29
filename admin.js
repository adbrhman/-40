import { store } from './store.js';
import { AuthService } from './auth.service.js';
import { AdminService } from './admin.service.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { showToast } from './toast.js';

const ADMIN_TABS = [
  { id: 'dashboard',  label: 'لوحة التحكم', icon: '📊' },
  { id: 'rounds',     label: 'الجولات',     icon: '📅' },
  { id: 'matches',    label: 'المباريات',   icon: '⚽' },
  { id: 'results',    label: 'النتائج',     icon: '🏁' },
  { id: 'users',      label: 'المستخدمون',  icon: '👥' },
  { id: 'leaderboard',label: 'الترتيب',     icon: '🏆' },
  { id: 'settings',   label: 'الإعدادات',   icon: '⚙️' },
];

let _currentTab = 'dashboard';

export async function renderAdmin(container) {
  try {
    await AuthService.requireAdmin();
  } catch {
    showToast('انتهت صلاحية الجلسة. أعد تسجيل الدخول.', 'error');
    await AuthService.logout();
    return;
  }

  const { user } = store.getState();

  setHTML(container, `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header">
          <span class="admin-logo-icon">👑</span>
          <div>
            <div class="admin-sidebar-title">لوحة الإدارة</div>
            <div class="admin-sidebar-user">${esc(user?.display_name || 'مشرف')}</div>
          </div>
        </div>
        <nav class="admin-nav">
          ${ADMIN_TABS.map(tab => `
            <button class="admin-nav-btn${tab.id === _currentTab ? ' active' : ''}" data-tab="${tab.id}">
              <span class="admin-nav-icon">${tab.icon}</span>
              <span>${tab.label}</span>
            </button>
          `).join('')}
          <button class="admin-nav-btn admin-logout" id="admin-logout">
            <span class="admin-nav-icon">🚪</span>
            <span>خروج</span>
          </button>
        </nav>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <button class="admin-menu-toggle" id="admin-menu-toggle">☰</button>
          <h1 class="admin-page-title" id="admin-page-title">لوحة التحكم</h1>
        </div>
        <div class="admin-content" id="admin-content">
          <div class="page-loader"><div class="spinner-ring"></div></div>
        </div>
      </div>
    </div>
  `);

  const content = container.querySelector('#admin-content');

  container.querySelectorAll('.admin-nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      _currentTab = btn.dataset.tab;
      container.querySelectorAll('.admin-nav-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === _currentTab));
      const titleEl = container.querySelector('#admin-page-title');
      if (titleEl) titleEl.textContent = ADMIN_TABS.find(t => t.id === _currentTab)?.label || '';
      _loadTab(_currentTab, content);
      container.querySelector('.admin-sidebar')?.classList.remove('open');
    });
  });

  container.querySelector('#admin-logout').addEventListener('click', async () => {
    await AuthService.logout();
  });

  container.querySelector('#admin-menu-toggle').addEventListener('click', () => {
    container.querySelector('.admin-sidebar')?.classList.toggle('open');
  });

  _loadTab(_currentTab, content);
}

async function _loadTab(tab, content) {
  setHTML(content, '<div class="page-loader"><div class="spinner-ring"></div></div>');
  try {
    const mod = await import(`./${tab}.js`);
    await mod.default?.(content);
  } catch (err) {
    setHTML(content, `
      <div class="admin-empty">
        <p style="color:var(--color-danger)">فشل تحميل ${esc(tab)}: ${esc(err.message)}</p>
      </div>
    `);
  }
}
