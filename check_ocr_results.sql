-- OCR結果の詳細確認
-- Supabase SQL Editorで実行してください

SELECT 
  r.filename,
  r.processing_status,
  r.confidence_score,
  r.error_message,
  r.extracted_data,
  LENGTH(r.ocr_text) as OCRテキスト長,
  SUBSTRING(r.ocr_text, 1, 200) as OCR文字列サンプル
FROM receipts r
JOIN user_profiles up ON r.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY r.upload_date DESC
LIMIT 5;