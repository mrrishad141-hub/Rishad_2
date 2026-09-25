import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
  storageKey: 'tactical-comms-auth',
  storage: {
      getItem: (key: string) => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      },
      setItem: (key: string, value: any) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
