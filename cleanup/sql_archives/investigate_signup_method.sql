-- ユーザーのサインアップ方法調査
-- Supabase SQL Editorで実行

-- 1. ユーザーの認証情報詳細
SELECT 
  id,
  email,
  phone,
  email_confirmed_at,
  phone_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  app_metadata,
  user_metadata,
  aud as audience,
  role
FROM auth.users 
WHERE email = 'airisgarden358@gmail.com';

-- 2. 認証プロバイダー確認
SELECT 
  user_id,
  provider,
  created_at,
  updated_at
FROM auth.identities 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'airisgarden358@gmail.com'
);

-- 3. セッション履歴確認（最近のログイン）
SELECT 
  user_id,
  created_at,
  updated_at,
  factor_id,
  aal,
  not_after
FROM auth.sessions 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'airisgarden358@gmail.com'
)
ORDER BY created_at DESC
LIMIT 5;