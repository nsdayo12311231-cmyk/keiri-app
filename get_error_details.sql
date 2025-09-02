-- テストユーザーの実際のエラー詳細を確認
-- Supabase SQL Editorで実行してください

SELECT 
  r.filename,
  r.upload_date,
  r.processing_status,
  r.error_message,
  r.confidence_score,
  LENGTH(r.ocr_text) as OCRテキスト長,
  r.extracted_data,
  r.created_at
FROM receipts r
JOIN user_profiles up ON r.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY r.created_at DESC
LIMIT 3;