import { supabase } from './config.js';
import { CACHE } from './cache.js';
import { CACHE_TTL } from './config.js';
import { withRetry } from './helpers.js';
import { safeId } from './security.js';

export const LeaderboardService = {

  async get(compId, mode = 'global', season = 'this') {
    const safe = safeId(compId);
    const cacheKey = `lb:${safe}:${mode}:${season}`;
    const cached = CACHE.get(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('leaderboard')
      .select(`user_id, total_points, exact_scores, users(display_name, avatar_url, title, country)`)
      .order('total_points', { ascending: false })
      .limit(100);

    if (safe) query = query.eq('competition_id', safe);

    const { data, error } = await withRetry(() => query);
    if (error) throw new Error('فشل تحميل الترتيب');

    const rows = (data || []).map((row, idx) => ({
      rank:        idx + 1,
      userId:      row.user_id,
      points:      row.total_points || 0,
      exactScores: row.exact_scores || 0,
      name:        row.users?.display_name || 'مجهول',
      avatar:      row.users?.avatar_url || null,
      title:       row.users?.title || 'لاعب',
      country:     row.users?.country || null,
    }));

    CACHE.set(cacheKey, rows, CACHE_TTL.lb);
    return rows;
  },

  async getUserRank(userId, compId) {
    const rows = await LeaderboardService.get(compId);
    return rows.findIndex(r => r.userId === userId) + 1;
  },

  async adminAdjust(userId, points, note = '') {
    const { error } = await supabase.rpc('admin_adjust_points', {
      p_user_id: userId,
      p_points: points,
      p_note: note,
    });
    if (error) throw new Error('فشل تعديل النقاط');
    CACHE.invalidatePattern('lb:');
  },
};
