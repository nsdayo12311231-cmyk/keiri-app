import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database.types';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

// APIルート用の認証付きクライアント作成
export async function createAuthenticatedServerClient(request?: Request) {
  let headersList: Headers;
  let cookieStore: Awaited<ReturnType<typeof cookies>>;
  
  try {
    headersList = request ? new Headers(request.headers) : await headers();
    cookieStore = await cookies();
  } catch (error) {
    console.error('Headers/Cookies取得エラー:', error);
    throw new Error('認証コンテキストの取得に失敗しました');
  }
  
  // Authorizationヘッダーからトークンを取得
  const authHeader = headersList.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    console.error('認証トークンが見つかりません');
  }

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore for API routes
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignore for API routes
          }
        },
      },
    },
  );
}

// フォールバック用のシンプルなクライアント（APIルート専用）
export function createSimpleServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
