-- シンプルなレシートデータ確認クエリ
-- Supabase SQL Editorで実行してください

-- テストユーザーのレシートがあるかチェック
SELECT COUNT(*) as レシート数
FROM receipts r
JOIN user_profiles up ON r.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com';

-- もしレシートがある場合の詳細
SELECT 
  r.filename,
  r.upload_date,
  r.processing_status,
  r.is_processed,
  r.error_message
FROM receipts r
JOIN user_profiles up ON r.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY r.upload_date DESC;