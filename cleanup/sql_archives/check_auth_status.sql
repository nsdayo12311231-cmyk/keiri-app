-- 認証状態とメタデータの比較
-- Supabase SQL Editorで実行してください

-- auth.usersテーブルから認証情報を確認
SELECT 
  '認証情報比較' as 種別,
  email,
  id,
  aud,
  role,
  email_confirmed_at,
  phone_confirmed_at,
  confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data
FROM auth.users
WHERE email IN ('airisgarden358@gmail.com', 'あなたのメールアドレス')
ORDER BY email;