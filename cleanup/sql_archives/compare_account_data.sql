-- アカウントデータとマスターデータの比較
-- Supabase SQL Editorで実行してください

-- 1. テストユーザーのアカウント詳細
SELECT 
  'テストユーザーのアカウント' as 種別,
  a.id,
  a.account_name,
  a.account_type,
  a.is_active,
  a.created_at
FROM accounts a
JOIN user_profiles up ON a.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com';

-- 2. 勘定科目マスターデータの存在確認
SELECT 
  'マスターデータ確認' as 種別,
  COUNT(*) as 勘定科目数,
  COUNT(CASE WHEN category_type = 'expense' THEN 1 END) as 費用科目数
FROM account_categories
WHERE is_active = true;

-- 3. すべてのユーザーのアカウント数比較
SELECT 
  'ユーザー別アカウント数' as 種別,
  up.email,
  COUNT(a.id) as アカウント数
FROM user_profiles up
LEFT JOIN accounts a ON up.id = a.user_id
GROUP BY up.email, up.id
HAVING COUNT(a.id) > 0
ORDER BY COUNT(a.id) DESC;