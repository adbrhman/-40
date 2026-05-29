function createStore(config) {
  let _state = structuredClone(config.initialState);
  const _listeners = new Set();
  const _selectors = config.selectors || {};

  const store = {
    getState() { return _state; },

    dispatch(actionName, payload) {
      const reducer = config.reducers?.[actionName];
      if (!reducer) { console.warn(`[Store] Unknown action: ${actionName}`); return; }
      const next = reducer(_state, payload);
      if (next !== _state) {
        _state = next;
        _listeners.forEach(fn => {
          try { fn(_state, actionName, payload); }
          catch (err) { console.error('[Store] Listener error:', err); }
        });
      }
    },

    subscribe(listener) {
      _listeners.add(listener);
      return () => _listeners.delete(listener);
    },

    select(selectorName, ...args) {
      const sel = _selectors[selectorName];
      if (!sel) throw new Error(`[Store] Unknown selector: ${selectorName}`);
      return sel(_state, ...args);
    },

    setState(partial) {
      _state = { ..._state, ...partial };
      _listeners.forEach(fn => {
        try { fn(_state, '__setState', partial); }
        catch (err) { console.error('[Store] Listener error:', err); }
      });
    },
  };

  return store;
}

export const store = createStore({
  initialState: {
    session: null, user: null, isAdmin: false,
    comps: [], compId: null, comp: null,
    pts: { exact: 3, result: 0, double: 6 },
    pred: null, lb: null, hist: null,
    inputs: {}, doubleId: null, submitted: false,
    tab: 'pred', lbMode: 'global', lbSeason: 'this',
    realtimeStatus: 'disconnected',
    globalNotice: '', registrationEnabled: true, doubleEnabled: true,
    adminVerifiedAt: 0,
  },

  reducers: {
    SET_SESSION:    (s, session)  => ({ ...s, session }),
    SET_USER:       (s, user)     => ({ ...s, user }),
    SET_IS_ADMIN:   (s, isAdmin)  => ({ ...s, isAdmin }),
    SET_COMPS:      (s, comps)    => ({ ...s, comps }),
    SET_COMP_ID:    (s, compId)   => ({ ...s, compId }),
    SET_COMP:       (s, comp)     => ({ ...s, comp, pts: comp?.settings || s.pts }),
    SET_PRED:       (s, pred)     => ({ ...s, pred }),
    SET_LB:         (s, lb)       => ({ ...s, lb }),
    SET_HIST:       (s, hist)     => ({ ...s, hist }),
    SET_INPUTS:     (s, inputs)   => ({ ...s, inputs }),
    SET_DOUBLE_ID:  (s, doubleId) => ({ ...s, doubleId }),
    SET_SUBMITTED:  (s, submitted) => ({ ...s, submitted }),
    SET_TAB:        (s, tab)      => ({ ...s, tab }),
    SET_LB_MODE:    (s, lbMode)   => ({ ...s, lbMode }),
    SET_LB_SEASON:  (s, lbSeason) => ({ ...s, lbSeason }),
    SET_RT_STATUS:  (s, realtimeStatus) => ({ ...s, realtimeStatus }),
    SET_SETTINGS:   (s, settings) => ({ ...s, ...settings }),
    SET_ADMIN_VERIFIED: (s, ts)   => ({ ...s, adminVerifiedAt: ts }),

    UPDATE_SCORE_INPUT(s, { matchId, side, value }) {
      const current = s.inputs[matchId] || { home: null, away: null };
      return { ...s, inputs: { ...s.inputs, [matchId]: { ...current, [side]: value } } };
    },

    CLEAR_INPUTS(s) {
      return { ...s, inputs: {}, doubleId: null, submitted: false };
    },

    LOGOUT(s) {
      return {
        ...s,
        session: null, user: null, isAdmin: false,
        pred: null, lb: null, hist: null,
        inputs: {}, doubleId: null, submitted: false,
        tab: 'pred',
      };
    },
  },

  selectors: {
    isLoggedIn:  (s) => !!s.session,
    currentUser: (s) => s.user,
    activeComp:  (s) => s.comp,
    activePts:   (s) => s.pts,
    matchInput:  (s, matchId) => s.inputs[matchId] || { home: null, away: null },
    isDouble:    (s, matchId) => s.doubleId === matchId,
    canSubmit(s) {
      if (!s.pred?.matches?.length) return false;
      const openMatches = s.pred.matches.filter(m => m.status === 'open' || m._isOpen);
      return openMatches.every(m => {
        const inp = s.inputs[m.id];
        return inp?.home !== null && inp?.away !== null;
      });
    },
  },
});
