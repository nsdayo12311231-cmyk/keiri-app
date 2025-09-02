-- テストユーザーのデータ確認クエリ
-- Supabase SQL Editorで実行してください

-- 1. テストユーザーのIDとプロフィール情報を確認
SELECT 
  'ユーザープロフィール' as データ種別,
  id as ユーザーID, 
  email, 
  full_name,
  created_at
FROM user_profiles 
WHERE email = 'airisgarden358@gmail.com';

-- 2. テストユーザーのアカウント情報を確認
SELECT 
  'アカウント情報' as データ種別,
  a.id as アカウントID,
  a.account_name as 口座名,
  a.account_type as 種別,
  a.is_active as アクティブ,
  a.created_at
FROM accounts a
JOIN user_profiles up ON a.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com';

-- 3. テストユーザーのレシートデータを確認
SELECT 
  'レシートデータ' as データ種別,
  r.id as レシートID,
  r.filename as ファイル名,
  r.upload_date as アップロード日時,
  r.is_processed as 処理済み,
  r.processing_status as 処理状況,
  r.transaction_id as 取引ID,
  r.confidence_score as 信頼度,
  r.extracted_data as 抽出データ
FROM receipts r
JOIN user_profiles up ON r.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY r.upload_date DESC;

-- 4. テストユーザーの取引データを確認
SELECT 
  '取引データ' as データ種別,
  t.id as 取引ID,
  t.amount as 金額,
  t.description as 説明,
  t.transaction_date as 取引日,
  t.is_business as 事業用,
  t.confidence_score as 信頼度,
  t.created_at
FROM transactions t
JOIN user_profiles up ON t.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY t.created_at DESC;

-- 5. レシートと取引の連携状況を確認
SELECT 
  'レシート-取引連携' as データ種別,
  r.filename as レシートファイル名,
  r.processing_status as レシート処理状況,
  r.transaction_id as 連携取引ID,
  t.amount as 取引金額,
  t.description as 取引説明,
  r.upload_date as レシートアップロード日時,
  t.created_at as 取引作成日時
FROM receipts r
LEFT JOIN transactions t ON r.transaction_id = t.id
JOIN user_profiles up ON r.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY r.upload_date DESC;