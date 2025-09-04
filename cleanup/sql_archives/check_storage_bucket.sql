-- Supabase Storageバケットの確認
-- Supabase SQL Editorで実行してください

-- receiptsバケットが存在するかチェック
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE name = 'receipts';