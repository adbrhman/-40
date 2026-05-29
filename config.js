export const SUPABASE_URL = 'https://jwqeyzeejwfizmqtbsaz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_lhQllygeY_QagLi_jPEM5w_s8jLS7y5';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const DEFAULT_PTS = {
  exact: 3,
  result: 0,
  double: 6,
};

export const CACHE_TTL = {
  pred: 120_000,
  lb: 180_000,
  hist: 300_000,
  comp: 600_000,
  user: 60_000,
};

export const REALTIME_CONFIG = {
  maxRetries: 6,
  baseDelay: 800,
  maxDelay: 30_000,
  pollInterval: 60_000,
};

export const RATE_LIMITS = {
  login:    { count: 5,  windowMs: 60_000 },
  register: { count: 2,  windowMs: 600_000 },
  submit:   { count: 3,  windowMs: 60_000 },
};

export const COMP_LOGOS = {
  epl:    'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
  ucl:    'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg',
  wc:     'https://upload.wikimedia.org/wikipedia/en/9/9a/2022_FIFA_World_Cup_official_emblem.svg',
  fa_cup: 'https://upload.wikimedia.org/wikipedia/en/7/73/The_FA_Cup_Logo_2022.svg',
  europa: 'https://upload.wikimedia.org/wikipedia/en/0/05/UEFA_Europa_League_logo.svg',
};
