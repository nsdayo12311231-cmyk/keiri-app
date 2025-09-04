-- 最近のレシート処理状況を詳細確認
-- Supabase SQL Editorで実行してください

-- テストユーザーの最新レシート処理状況
SELECT 
  r.filename,
  r.upload_date,
  r.processing_status,
  r.is_processed,
  r.confidence_score,
  r.error_message,
  r.transaction_id,
  LENGTH(r.ocr_text) as OCRテキスト長,
  CASE 
    WHEN LENGTH(r.ocr_text) > 0 THEN '✅ OCR成功'
    ELSE '❌ OCR失敗'
  END as OCR状況,
  r.extracted_data
FROM receipts r
JOIN user_profiles up ON r.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY r.upload_date DESC
LIMIT 5;