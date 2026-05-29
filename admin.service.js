import { supabase } from './config.js';
import { CACHE } from './cache.js';
import { AuthService } from './auth.service.js';
import { withRetry } from './helpers.js';
import { safeId, sanitize } from './security.js';

export const AdminService = {

  async getStats() {
    await AuthService.requireAdmin();
    const [matches, users, preds, lb] = await Promise.all([
      supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('predictions').select('id', { count: 'exact', head: true }),
      supabase.from('leaderboard').select('total_points').order('total_points', { ascending: false }).limit(1),
    ]);
    return {
      openMatches: matches.count || 0,
      activeUsers: users.count || 0,
      totalPreds:  preds.count || 0,
      topPoints:   lb.data?.[0]?.total_points || 0,
    };
  },

  async getGameweeks(compId) {
    const safe = safeId(compId);
    const { data, error } = await supabase.from('gameweeks').select('*')
      .eq('competition_id', safe).order('created_at', { ascending: false });
    if (error) throw new Error('فشل تحميل الجولات');
    return data || [];
  },

  async createGameweek(gw) {
    await AuthService.requireAdmin();
    const { data, error } = await supabase.from('gameweeks').insert(gw).select().single();
    if (error) throw new Error('فشل إنشاء الجولة');
    CACHE.invalidatePattern('gw:');
    return data;
  },

  async updateGameweek(gwId, updates) {
    await AuthService.requireAdmin();
    const { error } = await supabase.from('gameweeks').update(updates).eq('id', gwId);
    if (error) throw new Error('فشل تحديث الجولة');
    CACHE.invalidatePattern('gw:');
  },

  async setActiveGameweek(compId, gwId) {
    await AuthService.requireAdmin();
    await supabase.from('gameweeks').update({ is_active: false }).eq('competition_id', compId);
    await supabase.from('gameweeks').update({ is_active: true }).eq('id', gwId);
    CACHE.invalidatePattern('gw:');
  },

  async calculateRound(gameweekId) {
    await AuthService.requireAdmin();
    const safe = safeId(gameweekId);
    const { error: rpcError } = await supabase.rpc('calculate_round_points', { p_gameweek_id: safe });
    if (!rpcError) {
      CACHE.invalidatePattern('lb:');
      CACHE.invalidatePattern('pred:');
      return { method: 'rpc' };
    }
    return await AdminService._calcRoundJS(safe);
  },

  async _calcRoundJS(gameweekId) {
    const { data: matches } = await supabase.from('matches')
      .select('id, home_score, away_score, status').eq('gameweek_id', gameweekId).eq('status', 'finished');
    if (!matches?.length) throw new Error('لا توجد مباريات منتهية');

    const { data: preds } = await supabase.from('predictions')
      .select('id, user_id, match_id, home_score, away_score, is_double')
      .in('match_id', matches.map(m => m.id));

    const { data: settings } = await supabase.from('settings').select('key, value')
      .in('key', ['pts_exact', 'pts_double']);

    const PTS = {
      exact:  parseInt(settings?.find(s => s.key === 'pts_exact')?.value  || '3'),
      double: parseInt(settings?.find(s => s.key === 'pts_double')?.value || '6'),
    };

    const matchMap = new Map(matches.map(m => [m.id, m]));
    const updates  = [];

    for (const pred of (preds || [])) {
      const match = matchMap.get(pred.match_id);
      if (!match) continue;
      const correct = pred.home_score === match.home_score && pred.away_score === match.away_score;
      const pts = correct ? (pred.is_double ? PTS.double : PTS.exact) : 0;
      updates.push({ id: pred.id, points_earned: pts });
    }

    for (let i = 0; i < updates.length; i += 25) {
      await supabase.from('predictions').upsert(updates.slice(i, i + 25));
    }

    await AdminService._rebuildLeaderboard();
    CACHE.invalidatePattern('lb:');
    CACHE.invalidatePattern('pred:');
    return { method: 'js', processed: updates.length };
  },

  async _rebuildLeaderboard() {
    const { data } = await supabase.from('predictions').select('user_id, points_earned, is_double');
    if (!data) return;
    const totals = {};
    const exacts = {};
    for (const p of data) {
      if (!totals[p.user_id]) { totals[p.user_id] = 0; exacts[p.user_id] = 0; }
      totals[p.user_id] += p.points_earned || 0;
      if (p.points_earned > 0 && !p.is_double) exacts[p.user_id]++;
    }
    const rows = Object.entries(totals).map(([uid, pts]) => ({
      user_id: uid, total_points: pts, exact_scores: exacts[uid] || 0,
    }));
    for (let i = 0; i < rows.length; i += 20) {
      await supabase.from('leaderboard').upsert(rows.slice(i, i + 20), { onConflict: 'user_id' });
    }
  },

  async getUsers(page = 0, pageSize = 50, search = '') {
    await AuthService.requireAdmin();
    let query = supabase.from('users')
      .select('id, display_name, username, is_admin, status, created_at, avatar_url')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (search) query = query.ilike('display_name', `%${sanitize(search)}%`);
    const { data, error } = await query;
    if (error) throw new Error('فشل تحميل المستخدمين');
    return data || [];
  },

  async updateUser(userId, updates) {
    await AuthService.requireAdmin();
    const safe = safeId(userId);
    const { error } = await supabase.from('users').update(updates).eq('id', safe);
    if (error) throw new Error('فشل تحديث المستخدم');
    CACHE.invalidate(`user:${safe}`);
  },

  async suspendUser(userId)  { return AdminService.updateUser(userId, { status: 'suspended' }); },
  async activateUser(userId) { return AdminService.updateUser(userId, { status: 'active' }); },

  async updateSettings(settings) {
    await AuthService.requireAdmin();
    const upserts = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
    const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' });
    if (error) throw new Error('فشل حفظ الإعدادات');
  },

  _logs: [],
  log(event) {
    AdminService._logs.unshift({ ...event, ts: new Date().toISOString() });
    if (AdminService._logs.length > 150) AdminService._logs.length = 150;
  },
};
