import { AuthService } from './auth.service.js';
import { setHTML } from './renderer.js';

export function renderRegister(container, onSuccess, onLogin) {
  setHTML(container, `
    <div class="auth-hero">
      <div class="auth-hero-bg"></div>
      <div class="auth-logo-wrap">
        <div class="auth-lion-icon">🦁</div>
        <h1 class="auth-brand-name">توقعات النخبة</h1>
        <p class="auth-brand-sub">انضم إلى النخبة وتوقع مع الأبطال</p>
      </div>
    </div>
    <div class="auth-form-card">
      <div class="auth-card-crown">✨</div>
      <h2 class="auth-form-title">إنشاء حساب جديد</h2>
      <p class="auth-form-sub">اختر اسماً مميزاً يمثلك في بطولات التوقعات</p>
      <div id="reg-error" style="display:none; margin-bottom:12px; text-align:center; color:var(--color-danger); font-size:14px;"></div>
      <div class="form-group" id="fg-name">
        <div class="form-input-wrap">
          <input type="text" id="inp-name" class="form-input" placeholder="اسم المستخدم (3-32 حرف)" autocomplete="username" autocorrect="off" autocapitalize="off" maxlength="32" dir="auto" />
          <span class="form-input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
        </div>
        <span class="form-error">يجب أن يكون الاسم 3 أحرف على الأقل</span>
      </div>
      <div class="form-group" id="fg-pass-new">
        <div class="form-input-wrap">
          <input type="password" id="inp-pass-new" class="form-input has-btn-left" placeholder="كلمة المرور (6 أحرف على الأقل)" autocomplete="new-password" />
          <span class="form-input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
          <button type="button" class="form-input-btn btn-toggle-pass-reg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <span class="form-error">كلمة المرور 6 أحرف على الأقل</span>
      </div>
      <div class="form-group" id="fg-pass-confirm">
        <div class="form-input-wrap">
          <input type="password" id="inp-pass-confirm" class="form-input has-btn-left" placeholder="تأكيد كلمة المرور" autocomplete="new-password" />
          <span class="form-input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
        </div>
        <span class="form-error">كلمة المرور غير متطابقة</span>
      </div>
      <button class="btn-primary btn-press" id="btn-register" type="button">
        <span style="font-size:18px">🚀</span> إنشاء الحساب
      </button>
    </div>
    <div class="auth-footer">
      لديك حساب بالفعل؟ <a id="btn-go-login">تسجيل الدخول</a>
    </div>
  `);

  const btnRegister = container.querySelector('#btn-register');
  const inpName     = container.querySelector('#inp-name');
  const inpPass     = container.querySelector('#inp-pass-new');
  const inpConfirm  = container.querySelector('#inp-pass-confirm');
  const errorBox    = container.querySelector('#reg-error');

  container.querySelectorAll('.btn-toggle-pass-reg').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = btn.closest('.form-input-wrap').querySelector('input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  });

  async function doRegister() {
    const name = inpName.value.trim();
    const pass  = inpPass.value;
    const conf  = inpConfirm.value;
    errorBox.style.display = 'none';
    let valid = true;

    if (!name || name.length < 3) { container.querySelector('#fg-name').classList.add('has-error'); valid = false; }
    else container.querySelector('#fg-name').classList.remove('has-error');
    if (!pass || pass.length < 6) { container.querySelector('#fg-pass-new').classList.add('has-error'); valid = false; }
    else container.querySelector('#fg-pass-new').classList.remove('has-error');
    if (pass !== conf) { container.querySelector('#fg-pass-confirm').classList.add('has-error'); valid = false; }
    else container.querySelector('#fg-pass-confirm').classList.remove('has-error');
    if (!valid) return;

    btnRegister.disabled = true;
    btnRegister.innerHTML = '<div class="spinner-ring" style="width:22px;height:22px;border-width:2px;"></div>';

    try {
      const session = await AuthService.register(name, pass);
      onSuccess(session);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      btnRegister.disabled = false;
      btnRegister.innerHTML = '<span style="font-size:18px">🚀</span> إنشاء الحساب';
    }
  }

  btnRegister.addEventListener('click', doRegister);
  inpConfirm.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
  container.querySelector('#btn-go-login').addEventListener('click', onLogin);
  setTimeout(() => inpName.focus(), 100);
}
