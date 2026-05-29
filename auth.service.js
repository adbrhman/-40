import { supabase } from './config.js';
import { store } from './store.js';
import { CACHE } from './cache.js';
import { sanitize, safeId } from './security.js';
import { rateLimiter } from './rate-limiter.js';
import { withRetry } from './helpers.js';

export const AuthService = {

  async login(identifier, password) {
    if (!rateLimiter.check('login')) {
      const wait = Math.ceil((rateLimiter.nextAllowedAt('login') - Date.now()) / 1000);
      throw new Error(`حاولت كثيراً. انتظر ${wait} ثانية.`);
    }
    const cleanId = sanitize(identifier.trim());
    if (!cleanId || !password) throw new Error('يرجى إدخال جميع البيانات');

    let email = null;
    try {
      const { data, error } = await supabase.rpc('find_user_for_login', { p_identifier: cleanId });
      if (!error && data?.email) email = data.email;
    } catch { /* ignore */ }

    if (!email) {
      const { data: users } = await supabase.from('users').select('email')
        .or(`display_name.ilike.${cleanId},username.ilike.${cleanId}`).limit(1);
      if (users?.[0]?.email) email = users[0].email;
    }

    if (!email && cleanId.includes('@')) email = cleanId;
    if (!email) throw new Error('المستخدم غير موجود');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('كلمة المرور خاطئة أو الحساب معطل');
    return data.session;
  },

  async register(displayName, password) {
    if (!rateLimiter.check('register')) throw new Error('حاولت التسجيل أكثر من مرة. انتظر قليلاً.');
    const name = sanitize(displayName.trim());
    if (!name || name.length < 3) throw new Error('يجب أن يكون الاسم 3 أحرف على الأقل');
    if (password.length < 6) throw new Error('كلمة المرور 6 أحرف على الأقل');

    const { data: existing } = await supabase.from('users').select('id').ilike('display_name', name).limit(1);
    if (existing?.length) throw new Error('هذا الاسم مستخدم بالفعل');

    const fakeEmail = `${crypto.randomUUID()}@noreply.tokaat.app`;
    const { data: authData, error: signupError } = await supabase.auth.signUp({ email: fakeEmail, password });
    if (signupError) throw new Error('فشل إنشاء الحساب. حاول مجدداً.');

    const userId = authData.user?.id;
    if (!userId) throw new Error('فشل إنشاء الحساب');

    const { error: insertError } = await supabase.from('users').insert({
      id: userId, display_name: name,
      username: name.toLowerCase().replace(/\s+/g, '_'),
      email: fakeEmail, status: 'active', is_admin: false,
    });
    if (insertError) throw new Error('فشل حفظ بيانات المستخدم');

    await AuthService._restoreOldPoints(userId, name).catch(() => {});
    return authData.session;
  },

  async loadUserProfile(userId) {
    const cacheKey = `user:${userId}`;
    const cached = CACHE.get(cacheKey);
    if (cached) return cached;

    const { data, error } = await withRetry(() =>
      supabase.from('users')
        .select('id, display_name, username, is_admin, status, avatar_url, title, level, total_points, accuracy')
        .eq('id', userId).single()
    );

    if (error || !data) throw new Error('فشل تحميل بيانات المستخدم');
    if (data.status === 'suspended') throw new Error('تم تعليق حسابك. تواصل مع الإدارة.');
    CACHE.set(cacheKey, data, 60_000);
    return data;
  },

  async logout() {
    await supabase.auth.signOut();
    CACHE.clear();
    store.dispatch('LOGOUT');
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  },

  async requireAdmin() {
    const state = store.getState();
    const now = Date.now();
    const VERIFY_INTERVAL = 5 * 60_000;
    if (now - state.adminVerifiedAt < VERIFY_INTERVAL) return true;

    const { data: userData } = await supabase.from('users')
      .select('is_admin, status').eq('id', state.user?.id).single();

    if (!userData?.is_admin || userData.status !== 'active') {
      await AuthService.logout();
      throw new Error('انتهت صلاحية الجلسة الإدارية');
    }
    store.dispatch('SET_ADMIN_VERIFIED', now);
    return true;
  },

  async updateProfile(userId, updates) {
    const safe = {};
    if (updates.display_name) safe.display_name = sanitize(updates.display_name.trim());
    if (updates.avatar_url)   safe.avatar_url   = updates.avatar_url;
    if (updates.title)        safe.title        = sanitize(updates.title);
    const { error } = await supabase.from('users').update(safe).eq('id', userId);
    if (error) throw new Error('فشل تحديث الملف الشخصي');
    CACHE.invalidate(`user:${userId}`);
  },

  async changePassword(userId, newPassword) {
    if (newPassword.length < 6) throw new Error('كلمة المرور 6 أحرف على الأقل');
    const { error } = await supabase.rpc('admin_change_user_password', {
      p_user_id: userId, p_new_password: newPassword,
    });
    if (error) throw new Error('فشل تغيير كلمة المرور');
  },

  async _restoreOldPoints(userId, displayName) {
    const { data } = await supabase.from('points_backup').select('points')
      .ilike('display_name', displayName).limit(1);
    if (data?.[0]?.points > 0) {
      await supabase.from('leaderboard').upsert({ user_id: userId, total_points: data[0].points });
    }
  },
};
