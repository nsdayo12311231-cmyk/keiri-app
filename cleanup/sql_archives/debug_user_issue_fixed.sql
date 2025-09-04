-- 修正版: airisgarden358@gmail.com ユーザーの問題調査用SQL
-- Supabase SQL Editorで実行してください

-- 1. ユーザー情報確認
SELECT 
  id as user_id,
  email,
  created_at,
  updated_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'airisgarden358@gmail.com';

-- 2. ユーザープロファイル確認
SELECT * FROM user_profiles 
WHERE email = 'airisgarden358@gmail.com';

-- 3. レシートテーブル確認
SELECT 
  id,
  user_id,
  filename,
  upload_date,
  is_processed,
  ocr_text IS NOT NULL as has_ocr_text,
  extracted_data IS NOT NULL as has_extracted_data
FROM receipts 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'airisgarden358@gmail.com'
)
ORDER BY upload_date DESC
LIMIT 10;

-- 4. transactionsテーブルの構造確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. トランザクションテーブル確認（正しいカラム名で）
SELECT 
  id,
  user_id,
  description,
  amount,
  transaction_date,
  created_at
FROM transactions 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'airisgarden358@gmail.com'
)
ORDER BY created_at DESC
LIMIT 10;

-- 6. レシートテーブルの構造も確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'receipts' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. RLS ポリシー確認
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('receipts', 'transactions')
ORDER BY tablename, policyname;