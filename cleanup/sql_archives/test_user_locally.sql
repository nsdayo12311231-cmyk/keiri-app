-- ローカルテスト用：airisgarden358@gmail.comユーザーの状況再確認

-- 1. ユーザープロファイルが正常に作成されているか確認
SELECT 
  'user_profiles' as table_name,
  id,
  email,
  full_name,
  business_type,
  created_at
FROM user_profiles 
WHERE email = 'airisgarden358@gmail.com';

-- 2. 最新のレシート試行状況
SELECT 
  'receipts' as table_name,
  id,
  user_id,
  filename,
  upload_date,
  is_processed,
  LENGTH(ocr_text) as ocr_text_length,
  extracted_data IS NOT NULL as has_extracted_data
FROM receipts 
WHERE user_id = 'a679c440-60b1-4427-a2d7-1f2a402d4b04'
ORDER BY upload_date DESC
LIMIT 5;

-- 3. 取引データの確認
SELECT 
  'transactions' as table_name,
  id,
  user_id,
  description,
  amount,
  transaction_date,
  created_at
FROM transactions 
WHERE user_id = 'a679c440-60b1-4427-a2d7-1f2a402d4b04'
ORDER BY created_at DESC
LIMIT 5;