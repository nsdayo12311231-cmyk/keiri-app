-- 開発者とテストユーザーの環境違いを比較
-- Supabase SQL Editorで実行してください

-- 1. 両ユーザーのプロフィール情報を比較
SELECT 
  'ユーザープロフィール比較' as 種別,
  email,
  id as ユーザーID,
  full_name,
  business_type,
  tax_year,
  created_at,
  updated_at
FROM user_profiles 
WHERE email IN ('airisgarden358@gmail.com', 'あなたのメールアドレス')
ORDER BY email;

-- 2. アカウント数の比較
SELECT 
  'アカウント数比較' as 種別,
  up.email,
  COUNT(a.id) as アカウント数
FROM user_profiles up
LEFT JOIN accounts a ON up.id = a.user_id
WHERE up.email IN ('airisgarden358@gmail.com', 'あなたのメールアドレス')
GROUP BY up.email, up.id;

-- 3. 取引データ数の比較
SELECT 
  '取引データ数比較' as 種別,
  up.email,
  COUNT(t.id) as 取引数
FROM user_profiles up
LEFT JOIN transactions t ON up.id = t.user_id
WHERE up.email IN ('airisgarden358@gmail.com', 'あなたのメールアドレス')
GROUP BY up.email, up.id;

-- 4. レシートデータ数の比較
SELECT 
  'レシートデータ数比較' as 種別,
  up.email,
  COUNT(r.id) as レシート数,
  COUNT(CASE WHEN r.processing_status = 'completed' THEN 1 END) as 成功数,
  COUNT(CASE WHEN r.processing_status = 'failed' THEN 1 END) as 失敗数,
  COUNT(CASE WHEN r.processing_status = 'processing' THEN 1 END) as 処理中数
FROM user_profiles up
LEFT JOIN receipts r ON up.id = r.user_id
WHERE up.email IN ('airisgarden358@gmail.com', 'あなたのメールアドレス')
GROUP BY up.email, up.id;