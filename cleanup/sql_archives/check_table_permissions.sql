-- テーブルアクセス権限とRLSポリシーの詳細確認
-- Supabase SQL Editorで実行してください

-- 1. マスターデータ（account_categories）の存在確認
SELECT 
  'マスターデータ確認' as 種別,
  COUNT(*) as 全勘定科目数,
  COUNT(CASE WHEN category_type = 'expense' THEN 1 END) as 費用科目数,
  COUNT(CASE WHEN is_active = true THEN 1 END) as 有効科目数
FROM account_categories;

-- 2. RLSポリシーが正常に動作しているか確認
-- テストユーザーとして各テーブルにアクセス可能かテスト
SELECT 
  'RLSテスト_receipts' as 種別,
  COUNT(*) as アクセス可能レシート数
FROM receipts r
JOIN user_profiles up ON r.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com';

SELECT 
  'RLSテスト_transactions' as 種別,
  COUNT(*) as アクセス可能取引数
FROM transactions t
JOIN user_profiles up ON t.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com';

SELECT 
  'RLSテスト_accounts' as 種別,
  COUNT(*) as アクセス可能アカウント数
FROM accounts a
JOIN user_profiles up ON a.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com';

-- 3. 外部キー制約の確認
SELECT 
  '外部キー制約確認' as 種別,
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_name IN ('receipts', 'transactions', 'accounts')
ORDER BY table_name;