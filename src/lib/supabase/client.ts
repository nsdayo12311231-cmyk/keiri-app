import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client with optimizations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 2, // リアルタイム更新を制限
    },
  },
  global: {
    headers: {
      'x-client-info': 'keiri-app-client',
    },
  },
});

// For use in Client Components with Next.js App Router
export const createSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};