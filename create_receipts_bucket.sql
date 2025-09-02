-- receipts storageバケットを作成
-- Supabase SQL Editorで実行してください

-- receiptsバケットを作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;