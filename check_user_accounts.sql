-- テストユーザーのアカウント情報を確認
-- Supabase SQL Editorで実行してください

-- 1. テストユーザーの全アカウントを確認
SELECT 
  'テストユーザーのアカウント' as データ種別,
  a.id,
  a.account_name,
  a.account_type,
  a.is_active,
  a.created_at
FROM accounts a
JOIN user_profiles up ON a.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com';

-- 2. 現金口座が存在するかチェック
SELECT 
  '現金口座の存在確認' as データ種別,
  COUNT(*) as 現金口座数
FROM accounts a
JOIN user_profiles up ON a.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
  AND a.account_name = '現金';

-- 3. あなたのアカウントとの比較（参考用）
SELECT 
  'あなたのアカウント（参考）' as データ種別,
  a.id,
  a.account_name,
  a.account_type,
  a.is_active
FROM accounts a
JOIN user_profiles up ON a.user_id = up.id
WHERE up.email != 'airisgarden358@gmail.com'
  AND a.account_name = '現金'
LIMIT 3;