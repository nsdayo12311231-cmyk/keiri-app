-- Storage RLSポリシーの確認
-- Supabase SQL Editorで実行してください

-- storage.objectsテーブルのRLS設定を確認
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS有効"
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- storage.objectsのポリシー一覧を確認
SELECT 
  policyname as "ポリシー名",
  cmd as "コマンド",
  permissive as "許可型",
  qual as "条件",
  with_check as "チェック条件"
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
AND policyname LIKE '%receipt%';

-- receiptsテーブルのRLS設定も確認
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS有効"
FROM pg_tables 
WHERE tablename = 'receipts';

-- receiptsテーブルのポリシー一覧
SELECT 
  policyname as "ポリシー名",
  cmd as "コマンド",
  permissive as "許可型",
  qual as "条件"
FROM pg_policies 
WHERE tablename = 'receipts';