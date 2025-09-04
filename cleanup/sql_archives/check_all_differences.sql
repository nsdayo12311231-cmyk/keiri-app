-- 開発者とテストユーザーのあらゆる違いを詳細確認
-- Supabase SQL Editorで実行してください

-- 1. 詳細認証情報比較（プロバイダー、メタデータ等）
SELECT 
  '詳細認証比較' as 種別,
  email,
  aud,
  role,
  email_confirmed_at,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email IN ('airisgarden358@gmail.com', 'test@gmail.com')
ORDER BY email;

-- 2. アクセス頻度・セッション比較
SELECT 
  'セッション比較' as 種別,
  up.email,
  COUNT(ua.id) as アクティビティ数,
  MAX(ua.timestamp_utc) as 最新アクティビティ,
  COUNT(CASE WHEN ua.action_type = 'page_visit' THEN 1 END) as ページ訪問数,
  COUNT(CASE WHEN ua.action_type = 'click' THEN 1 END) as クリック数
FROM user_profiles up
LEFT JOIN user_activities ua ON up.id = ua.user_id
WHERE up.email IN ('airisgarden358@gmail.com', 'test@gmail.com')
GROUP BY up.email
ORDER BY up.email;

-- 3. デバイス・ブラウザ情報比較
SELECT 
  'デバイス情報比較' as 種別,
  up.email,
  us.device_type,
  us.os,
  us.browser,
  us.ip_address,
  us.started_at,
  us.last_activity
FROM user_profiles up
LEFT JOIN user_sessions us ON up.id = us.user_id
WHERE up.email IN ('airisgarden358@gmail.com', 'test@gmail.com')
ORDER BY up.email, us.started_at DESC;

-- 4. 権限・ロール確認
SELECT 
  '権限確認' as 種別,
  up.email,
  up.business_type,
  up.tax_year,
  CASE 
    WHEN up.created_at < '2025-09-01' THEN '初期ユーザー'
    ELSE '新規ユーザー'
  END as ユーザー種別
FROM user_profiles up
WHERE up.email IN ('airisgarden358@gmail.com', 'test@gmail.com')
ORDER BY up.email;