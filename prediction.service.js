import { supabase } from './config.js';
import { CACHE } from './cache.js';
import { CACHE_TTL } from './config.js';
import { withRetry } from './helpers.js';
import { safeId, safeScore } from './security.js';
import { rateLimiter } from './rate-limiter.js';
import { store } from './store.js';

export const PredictionService = {

  async getPredictions(userId, gameweekId) {
    const safe = safeId(gameweekId);
    if (!safe) return [];
    const cacheKey = `pred:${userId}:${safe}`;
    const cached = CACHE.get(cacheKey);
    if (cached) return cached;
    const { data, error } = await withRetry(() =>
      supabase.from('predictions')
        .select('id, match_id, home_score, away_score, is_double, points_earned, submitted_at')
        .eq('user_id', userId)
        .in('match_id', supabase.from('matches').select('id').eq('gameweek_id', safe))
    );
    if (error) return [];
    CACHE.set(cacheKey, data || [], CACHE_TTL.pred);
    return data || [];
  },

  async submitPredictions(userId, gameweekId, inputs, doubleId) {
    if (!rateLimiter.check('submit')) throw new Error('حاولت إرسال التوقعات كثيراً. انتظر دقيقة.');

    const predictions = Object.entries(inputs)
      .filter(([, v]) => v.home !== null && v.away !== null)
      .map(([matchId, v]) => ({
        user_id:    userId,
        match_id:   safeId(matchId),
        home_score: safeScore(v.home),
        away_score: safeScore(v.away),
        is_double:  matchId === String(doubleId),
      }))
      .filter(p => p.match_id !== null && p.home_score !== null && p.away_score !== null);

    if (!predictions.length) throw new Error('لا توجد توقعات صالحة للإرسال');

    const { error: rpcError } = await supabase.rpc('submit_predictions_v2', {
      p_user_id: userId, p_gameweek_id: gameweekId, p_predictions: predictions,
    });

    if (rpcError) {
      const { error: upsertError } = await supabase.from('predictions')
        .upsert(predictions, { onConflict: 'user_id,match_id' });
      if (upsertError) throw new Error('فشل إرسال التوقعات. حاول مجدداً.');
    }

    CACHE.invalidatePattern(`pred:${userId}`);
    store.dispatch('SET_SUBMITTED', true);
    store.dispatch('CLEAR_INPUTS');
  },

  async restoreDraft(userId, roundId) {
    const key = `draft:${userId}:${roundId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.userId !== userId || parsed.roundId !== roundId) return null;
      return parsed.data;
    } catch { return null; }
  },

  saveDraft(userId, roundId, inputs, doubleId) {
    const key = `draft:${userId}:${roundId}`;
    try {
      localStorage.setItem(key, JSON.stringify({ userId, roundId, data: { inputs, doubleId }, savedAt: Date.now() }));
    } catch { /* storage full */ }
  },

  clearDraft(userId, roundId) {
    localStorage.removeItem(`draft:${userId}:${roundId}`);
  },

  async getHistory(userId, compId) {
    const cacheKey = `hist:${userId}:${compId}`;
    const cached = CACHE.get(cacheKey);
    if (cached) return cached;

    const { data: rounds } = await supabase.from('gameweeks')
      .select('id, name, is_calculated').eq('competition_id', compId).eq('is_calculated', true)
      .order('created_at', { ascending: false });

    if (!rounds?.length) return [];

    const history = [];
    for (const round of rounds) {
      const { data: preds } = await supabase.from('predictions')
        .select('match_id, home_score, away_score, is_double, points_earned, matches(home_team, away_team, home_score, away_score, status)')
        .eq('user_id', userId)
        .in('match_id', supabase.from('matches').select('id').eq('gameweek_id', round.id));
      const totalPts = (preds || []).reduce((s, p) => s + (p.points_earned || 0), 0);
      history.push({ round, predictions: preds || [], totalPts });
    }

    CACHE.set(cacheKey, history, CACHE_TTL.hist);
    return history;
  },
};
