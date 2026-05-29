import { AuthService } from './auth.service.js';
import { setHTML } from './renderer.js';
import { showToast } from './toast.js';

export function renderLogin(container, onSuccess, onRegister) {
  setHTML(container, `
    <div class="auth-hero">
      <div class="auth-hero-bg"></div>
      <div class="auth-logo-wrap">
        <div class="auth-lion-icon">🦁</div>
        <h1 class="auth-brand-name">توقعات النخبة</h1>
        <p class="auth-brand-sub">توقع بكل بطولة .. عش كل لحظة</p>
        <div class="auth-comps-row">
          <div class="auth-comp-item"><img src="https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg" alt="EPL" onerror="this.style.display='none'" /><span>الدوري الإنجليزي</span></div>
          <div class="auth-comp-item"><img src="https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg" alt="UCL" onerror="this.style.display='none'" /><span>دوري أبطال أوروبا</span></div>
          <div class="auth-comp-item"><span style="font-size:24px">🏆</span><span>كأس العالم</span></div>
          <div class="auth-comp-item"><span style="font-size:24px">🏅</span><span>كأس الاتحاد</span></div>
          <div class="auth-comp-item"><img src="https://upload.wikimedia.org/wikipedia/en/0/05/UEFA_Europa_League_logo.svg" alt="EL" onerror="this.style.display='none'" /><span>الدوري الأوروبي</span></div>
        </div>
      </div>
    </div>
    <div class="auth-form-card">
      <div class="auth-card-crown">👑</div>
      <h2 class="auth-form-title">مرحباً بك في النخبة</h2>
      <p class="auth-form-sub">سجل دخولك للوصول إلى توقعاتك وإحصاياتك</p>
      <div id="login-error" style="display:none; margin-bottom:12px; text-align:center; color:var(--color-danger); font-size:14px;"></div>
      <div class="form-group" id="fg-identifier">
        <div class="form-input-wrap">
          <input type="text" id="inp-identifier" class="form-input" placeholder="البريد الإلكتروني أو اسم المستخدم" autocomplete="username" autocorrect="off" autocapitalize="off" spellcheck="false" dir="auto" />
          <span class="form-input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg></span>
        </div>
        <span class="form-error">هذا الحقل مطلوب</span>
      </div>
      <div class="form-group" id="fg-password">
        <div class="form-input-wrap">
          <input type="password" id="inp-password" class="form-input has-btn-left" placeholder="كلمة المرور" autocomplete="current-password" />
          <span class="form-input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
          <button type="button" id="btn-toggle-pass" class="form-input-btn" aria-label="إظهار/إخفاء">
            <svg id="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <span class="form-error">هذا الحقل مطلوب</span>
      </div>
      <div class="form-row">
        <label class="form-checkbox-wrap">
          <input type="checkbox" id="chk-remember" checked />
          <span class="form-checkbox-box"></span>
          <span class="form-checkbox-label">تذكرني</span>
        </label>
        <span class="form-link" id="btn-forgot">نسيت كلمة المرور؟</span>
      </div>
      <button class="btn-primary btn-press" id="btn-login" type="button">
        <span style="font-size:18px">⚡</span> دخول إلى المنصة
      </button>
      <div class="divider" style="margin:20px 0;">أو</div>
      <button class="btn-google btn-press" id="btn-google" type="button">
        <span class="btn-google-logo">G</span>
        التسجيل / الدخول بحساب Google
      </button>
    </div>
    <div class="auth-footer">
      ليس لديك حساب؟ <a id="btn-go-register">إنشاء حساب جديد</a>
    </div>
  `);

  const btnLogin      = container.querySelector('#btn-login');
  const btnGoogle     = container.querySelector('#btn-google');
  const btnTogglePass = container.querySelector('#btn-toggle-pass');
  const inpIdentifier = container.querySelector('#inp-identifier');
  const inpPassword   = container.querySelector('#inp-password');
  const errorBox      = container.querySelector('#login-error');

  btnTogglePass.addEventListener('click', () => {
    const isPass = inpPassword.type === 'password';
    inpPassword.type = isPass ? 'text' : 'password';
  });

  async function doLogin() {
    const identifier = inpIdentifier.value.trim();
    const password   = inpPassword.value;
    errorBox.style.display = 'none';

    let valid = true;
    if (!identifier) { container.querySelector('#fg-identifier').classList.add('has-error'); valid = false; }
    else container.querySelector('#fg-identifier').classList.remove('has-error');
    if (!password)   { container.querySelector('#fg-password').classList.add('has-error'); valid = false; }
    else container.querySelector('#fg-password').classList.remove('has-error');
    if (!valid) return;

    btnLogin.disabled = true;
    btnLogin.innerHTML = '<div class="spinner-ring" style="width:22px;height:22px;border-width:2px;"></div>';

    try {
      const session = await AuthService.login(identifier, password);
      onSuccess(session);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<span style="font-size:18px">⚡</span> دخول إلى المنصة';
    }
  }

  btnLogin.addEventListener('click', doLogin);
  inpPassword.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  inpIdentifier.addEventListener('keydown', e => { if (e.key === 'Enter') inpPassword.focus(); });

  container.querySelector('#btn-forgot').addEventListener('click', () => {
    showToast('تواصل مع المشرف لإعادة تعيين كلمة المرور', 'info');
  });

  btnGoogle.addEventListener('click', async () => {
    btnGoogle.disabled = true;
    try {
      const { supabase } = await import('../../core/config.js');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch {
      showToast('فشل تسجيل الدخول بـ Google', 'error');
      btnGoogle.disabled = false;
    }
  });

  container.querySelector('#btn-go-register').addEventListener('click', onRegister);
  setTimeout(() => inpIdentifier.focus(), 100);
}
