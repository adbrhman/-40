import { supabase } from './config.js';
import { CACHE } from './cache.js';
import { REALTIME_CONFIG } from './config.js';
import { store } from './store.js';

export const RealtimeService = {
  _channel: null,
  _retries: 0,
  _pollTimer: null,
  _onMatchUpdate: null,
  _onLbUpdate: null,

  setup({ onMatchUpdate, onLbUpdate }) {
    this._onMatchUpdate = onMatchUpdate;
    this._onLbUpdate    = onLbUpdate;
    this._connect();
  },

  _connect() {
    this._disconnect();
    this._channel = supabase
      .channel('app-realtime')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          CACHE.invalidatePattern('matches:');
          this._onMatchUpdate?.(payload.new);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leaderboard' },
        () => {
          CACHE.invalidatePattern('lb:');
          this._onLbUpdate?.();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this._retries = 0;
          store.dispatch('SET_RT_STATUS', 'connected');
          clearInterval(this._pollTimer);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this._handleDisconnect();
        }
      });
  },

  _handleDisconnect() {
    store.dispatch('SET_RT_STATUS', 'disconnected');
    this._retries++;
    if (this._retries > REALTIME_CONFIG.maxRetries) {
      this._startPolling();
      return;
    }
    const delay = Math.min(
      REALTIME_CONFIG.baseDelay * Math.pow(2, this._retries - 1),
      REALTIME_CONFIG.maxDelay
    );
    setTimeout(() => this._connect(), delay);
  },

  _startPolling() {
    store.dispatch('SET_RT_STATUS', 'polling');
    this._pollTimer = setInterval(() => {
      CACHE.invalidatePattern('matches:');
      CACHE.invalidatePattern('lb:');
      this._onMatchUpdate?.({});
      this._onLbUpdate?.();
    }, REALTIME_CONFIG.pollInterval);
  },

  _disconnect() {
    if (this._channel) {
      supabase.removeChannel(this._channel);
      this._channel = null;
    }
    clearInterval(this._pollTimer);
  },

  destroy() {
    this._disconnect();
    this._retries = 0;
  },
};
