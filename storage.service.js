import { supabase } from './config.js';

const STORAGE_KEYS = {
  compId:  'tokaat_comp_id',
  theme:   'tokaat_theme',
  locale:  'tokaat_locale',
};

export const StorageService = {

  getCompId()        { return localStorage.getItem(STORAGE_KEYS.compId); },
  setCompId(id)      { localStorage.setItem(STORAGE_KEYS.compId, String(id)); },

  async uploadAvatar(userId, file) {
    if (!file) throw new Error('لم يتم اختيار ملف');
    if (file.size > 2 * 1024 * 1024) throw new Error('الحجم الأقصى للصورة 2MB');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('نوع الملف غير مدعوم (JPEG/PNG/WEBP فقط)');
    }

    const ext  = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;

    const { error } = await supabase.storage
      .from('user-media')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw new Error('فشل رفع الصورة');

    const { data } = supabase.storage.from('user-media').getPublicUrl(path);
    return data.publicUrl;
  },

  getTeamLogoUrl(teamName) {
    if (!teamName) return null;
    const slug = encodeURIComponent(teamName.toLowerCase().replace(/\s+/g, '-'));
    return `https://api.sofascore.app/api/v1/unique-tournament/${slug}/image/dark`;
  },
};
