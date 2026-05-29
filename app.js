import { supabase } from './config.js';
import { store } from './store.js';
import { AuthService } from './auth.service.js';
import { MatchesService } from './matches.service.js';
import { RealtimeService } from './realtime.service.js';
import { renderLogin } from './login.js';
import { renderRegister } from './register.js';
import { renderPredictions } from './predictions.js';
import { renderLeaderboard } from './leaderboard.js';
import { renderHistory } from './history.js';
import { renderProfile } from './profile.js';
import { renderAdmin } from './admin.js';
import { BottomNav } from './bottom-nav.js';
import { showToast } from './toast.js';
import { esc } from './security.js';
import { getAvatarFallback } from './helpers.js';

const SCREENS = {
  loading: document.getElementById('screen-loading'),
  auth:    document.getElementById('screen-auth'),
  app:     document.getElementById('screen-app'),
  admin:   document.getElementById('screen-admin'),
};

let _nav = null;
let _currentTab = 'pred';
let _pageLoaded = { pred: false, lb: false, hist: false, profile: false };

function showScreen(name) {
  Object.entries(SCREENS).forEach(([key, el]) => el.classList.toggle('active', key === name));
}

async function init() {
  showScreen('loading');

  const session = await AuthService.getSession();

  if (session) {
    await onLoggedIn(session);
  } else {
    showAuthScreen();
  }

  AuthService.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await onLoggedIn(session);
    } else if (event === 'SIGNED_OUT') {
      onLoggedOut();
    }
  });
}

async function onLoggedIn(session) {
  store.dispatch('SET_SESSION', session);
  try {
    const user = await AuthService.loadUserProfile(session.user.id);
    store.dispatch('SET_USER', user);
    store.dispatch('SET_IS_ADMIN', user.is_admin);

    const [comps, settings] = await Promise.all([
      MatchesService.getCompetitions(),
      MatchesService.getSettings(),
    ]);

    store.dispatch('SET_COMPS', comps);

    if (settings) {
      store.dispatch('SET_SETTINGS', {
        globalNotice:         settings.global_notice || '',
        registrationEnabled:  settings.registration_enabled !== 'false',
        doubleEnabled:        settings.double_enabled !== 'false',
      });
    }

    const savedCompId = localStorage.getItem('tokaat_comp_id');
    const defaultComp = comps.find(c => String(c.id) === String(savedCompId)) || comps[0];

    if (defaultComp) {
      store.dispatch('SET_COMP_ID', defaultComp.id);
      store.dispatch('SET_COMP', defaultComp);
    }

    if (user.is_admin) {
      setupAdminScreen();
      showScreen('admin');
    } else {
      setupAppScreen();
      showScreen('app');
    }

    setupRealtime();
  } catch (err) {
    showToast(err.message || 'فشل تحميل البيانات. حاول مجدداً.', 'error');
    await AuthService.logout();
    showAuthScreen();
  }
}

function onLoggedOut() {
  RealtimeService.destroy();
  _nav = null;
  _pageLoaded = { pred: false, lb: false, hist: false, profile: false };
  showAuthScreen();
}

function showAuthScreen() {
  showScreen('auth');
  renderLogin(SCREENS.auth,
    () => {},
    () => renderRegister(SCREENS.auth, () => {}, () => renderLogin(SCREENS.auth, () => {}, () => {}))
  );
}

function setupAppScreen() {
  const { user, globalNotice } = store.getState();

  const headerAvatar  = document.getElementById('header-avatar');
  const headerTitle   = document.getElementById('header-title');
  const noticeEl      = document.getElementById('global-notice');
  const noticeTextEl  = document.getElementById('global-notice-text');
  const closeNoticeEl = document.getElementById('close-notice');

  if (headerAvatar) {
    headerAvatar.src = user.avatar_url || getAvatarFallback(user.display_name);
    headerAvatar.onerror = () => { headerAvatar.src = getAvatarFallback(user.display_name); };
  }

  if (globalNotice && noticeEl && noticeTextEl) {
    noticeTextEl.textContent = globalNotice;
    noticeEl.classList.remove('hidden');
  }

  closeNoticeEl?.addEventListener('click', () => noticeEl?.classList.add('hidden'));

  _setupCompSelector();
  _updateCompHeader();

  if (!_nav) {
    const navEl = document.getElementById('bottom-nav');
    _nav = new BottomNav(navEl, tabId => _switchTab(tabId));
  }

  document.getElementById('btn-user-avatar')?.addEventListener('click', () => _switchTab('profile'));

  _switchTab('pred');
}

function _setupCompSelector() {
  const btn      = document.getElementById('btn-comp-selector');
  const dropdown = document.getElementById('comp-dropdown');
  const list     = document.getElementById('comp-dropdown-list');

  btn?.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      const { comps, compId } = store.getState();
      list.innerHTML = comps.map(c => `
        <div class="comp-dropdown-item${String(c.id) === String(compId) ? ' active' : ''}" data-id="${esc(String(c.id))}">
          <img class="comp-dropdown-logo" src="${esc(c.logo_url || '')}" onerror="this.style.display='none'" />
          <span class="comp-dropdown-name">${esc(c.name)}</span>
        </div>
      `).join('');

      list.querySelectorAll('.comp-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const comp = store.getState().comps.find(c => String(c.id) === id);
          if (!comp) return;
          store.dispatch('SET_COMP_ID', comp.id);
          store.dispatch('SET_COMP', comp);
          store.dispatch('CLEAR_INPUTS');
          localStorage.setItem('tokaat_comp_id', String(comp.id));
          _updateCompHeader();
          dropdown.classList.add('hidden');
          _pageLoaded = { pred: false, lb: false, hist: false, profile: false };
          _switchTab(_currentTab);
        });
      });
    }
  });

  document.addEventListener('click', e => {
    if (!btn?.contains(e.target) && !dropdown?.contains(e.target)) dropdown?.classList.add('hidden');
  });
}

function _updateCompHeader() {
  const { comp } = store.getState();
  if (!comp) return;
  const logoEl = document.getElementById('header-comp-logo');
  const nameEl = document.getElementById('header-comp-name');
  if (logoEl) { logoEl.src = comp.logo_url || ''; logoEl.onerror = () => { logoEl.style.display = 'none'; }; }
  if (nameEl) nameEl.textContent = comp.name;
}

function _switchTab(tabId) {
  _currentTab = tabId;
  _nav?.setActive(tabId);

  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === tabId));

  const titles = { pred: 'التوقعات', lb: 'الترتيب', hist: 'السجل', profile: 'ملفي الشخصي' };
  const titleEl = document.getElementById('header-title');
  if (titleEl) titleEl.textContent = titles[tabId] || '';

  if (!_pageLoaded[tabId]) {
    _pageLoaded[tabId] = true;
    _loadPage(tabId);
  }
}

function _loadPage(tabId) {
  switch (tabId) {
    case 'pred':
      renderPredictions(
        document.getElementById('pred-content'),
        document.getElementById('pred-day-tabs-container')
      );
      break;
    case 'lb':
      renderLeaderboard(document.getElementById('lb-content'));
      break;
    case 'hist':
      renderHistory(document.getElementById('hist-content'));
      break;
    case 'profile':
      renderProfile(document.getElementById('profile-content'));
      break;
  }
}

function setupAdminScreen() {
  renderAdmin(document.getElementById('admin-root'));
}

function setupRealtime() {
  RealtimeService.setup({
    onMatchUpdate: () => {
      _pageLoaded.pred = false;
      if (_currentTab === 'pred') _loadPage('pred');
    },
    onLbUpdate: () => {
      _pageLoaded.lb = false;
      if (_currentTab === 'lb') _loadPage('lb');
    },
  });
}

init().catch(err => {
  console.error('[app] Fatal error:', err);
  showScreen('auth');
});
