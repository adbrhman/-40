import { supabase } from './config.js';
import { CACHE } from './cache.js';
import { withRetry } from './helpers.js';
import { safeId } from './security.js';

export const MatchesService = {

  async getActiveGameweek(compId) {
    const safe = safeId(compId);
    if (!safe) throw new Error('معرف البطولة غير صالح');
    const cacheKey = `gw:active:${safe}`;
    const cached = CACHE.get(cacheKey);
    if (cached) return cached;
    const { data, error } = await withRetry(() =>
      supabase.from('gameweeks').select('id, name, is_active, is_calculated, competition_id, deadline')
        .eq('competition_id', safe).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(1).single()
    );
    if (error) return null;
    CACHE.set(cacheKey, data, 60_000);
    return data;
  },

  async getMatchesByGameweek(gameweekId) {
    const safe = safeId(gameweekId);
    if (!safe) throw new Error('معرف الجولة غير صالح');
    const cacheKey = `matches:gw:${safe}`;
    const cached = CACHE.get(cacheKey);
    if (cached) return cached;
    const { data, error } = await withRetry(() =>
      supabase.from('matches')
        .select('id, home_team, away_team, match_date, status, home_score, away_score, competition_id, gameweek_id, home_logo, away_logo, comp_name')
        .eq('gameweek_id', safe).order('match_date', { ascending: true })
    );
    if (error) throw new Error('فشل تحميل المباريات');
    CACHE.set(cacheKey, data || [], 60_000);
    return data || [];
  },

  async getCommunityStats(gameweekId) {
    const safe = safeId(gameweekId);
    if (!safe) return {};
    const cacheKey = `community:${safe}`;
    const cached = CACHE.get(cacheKey);
    if (cached) return cached;
    const stats = {};
    CACHE.set(cacheKey, stats, 120_000);
    return stats;
  },

  async getCompetitions() {
    const cacheKey = 'comps:all';
    const cached = CACHE.get(cacheKey);
    if (cached) return cached;
    const { data, error } = await withRetry(() =>
      supabase.from('competitions').select('id, name, logo_url, settings, is_active')
        .eq('is_active', true).order('sort_order', { ascending: true })
    );
    if (error) return [];
    CACHE.set(cacheKey, data || [], 600_000);
    return data || [];
  },

  async getSettings() {
    const { data } = await supabase.from('settings').select('key, value')
      .in('key', ['pts_exact', 'double_enabled', 'global_notice', 'registration_enabled']);
    const settings = {};
    for (const row of (data || [])) settings[row.key] = row.value;
    return settings;
  },

  async adminCreateMatch(match) {
    const { data, error } = await supabase.from('matches').insert(match).select().single();
    if (error) throw new Error('فشل إضافة المباراة');
    CACHE.invalidatePattern('matches:');
    return data;
  },

  async adminUpdateMatch(matchId, updates) {
    const safe = safeId(matchId);
    const { error } = await supabase.from('matches').update(updates).eq('id', safe);
    if (error) throw new Error('فشل تحديث المباراة');
    CACHE.invalidatePattern('matches:');
  },

  async adminDeleteMatch(matchId) {
    const safe = safeId(matchId);
    const { error } = await supabase.from('matches').delete().eq('id', safe);
    if (error) throw new Error('فشل حذف المباراة');
    CACHE.invalidatePattern('matches:');
  },

  async adminSetResult(matchId, homeScore, awayScore) {
    const safe = safeId(matchId);
    const { error } = await supabase.from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'finished' }).eq('id', safe);
    if (error) throw new Error('فشل حفظ النتيجة');
    CACHE.invalidatePattern('matches:');
  },
};
