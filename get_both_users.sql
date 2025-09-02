-- 両ユーザーの詳細比較（あなたのメールアドレスも含む）
-- Supabase SQL Editorで実行してください

-- 1. まず、あなたのメールアドレスを特定
SELECT 
  'すべてのユーザー' as 種別,
  email,
  id,
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at
LIMIT 10;

-- 2. user_profilesテーブルとの比較
SELECT 
  'プロフィール比較' as 種別,
  au.email,
  au.id as auth_id,
  up.id as profile_id,
  up.full_name,
  CASE 
    WHEN up.id IS NULL THEN '❌ プロフィールなし'
    ELSE '✅ プロフィールあり'
  END as プロフィール状況
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.email = 'airisgarden358@gmail.com'
   OR au.created_at < '2025-09-02 00:00:00'  -- テストユーザー以前に作成されたユーザー
ORDER BY au.created_at;