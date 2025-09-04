-- airisgarden358@gmail.com ユーザーの問題調査用SQL
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
  processing_status,
  ocr_text IS NOT NULL as has_ocr_text,
  extracted_data IS NOT NULL as has_extracted_data
FROM receipts 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'airisgarden358@gmail.com'
)
ORDER BY upload_date DESC
LIMIT 10;

-- 4. トランザクションテーブル確認  
SELECT 
  id,
  user_id,
  description,
  amount,
  date,
  created_at
FROM transactions 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'airisgarden358@gmail.com'
)
ORDER BY created_at DESC
LIMIT 10;

-- 5. RLS ポリシー確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('receipts', 'transactions', 'user_profiles')
ORDER BY tablename, policyname;

-- 6. テストユーザーでのRLS動作確認（管理者として実行）
-- 注意: 実際のユーザーIDに置き換えてください
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO 'USER_ID_HERE';

-- レシート取得テスト
SELECT COUNT(*) as receipt_count FROM receipts;

-- トランザクション取得テスト  
SELECT COUNT(*) as transaction_count FROM transactions;

RESET ROLE;