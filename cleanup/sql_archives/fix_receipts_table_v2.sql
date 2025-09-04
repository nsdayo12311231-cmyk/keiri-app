-- レシートテーブルのスキーマ問題を修正（修正版）
-- Supabase SQL エディタで実行

-- 1. transaction_id列の型をTEXTからUUIDに修正
ALTER TABLE receipts 
ALTER COLUMN transaction_id TYPE UUID USING transaction_id::UUID;

-- 2. transaction_idの適切な外部キー制約を追加
ALTER TABLE receipts 
ADD CONSTRAINT fk_receipts_transaction_id 
FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- 3. レシート取引用のデフォルト「現金」口座を作成（重複チェック付き）
INSERT INTO accounts (
  user_id, 
  account_type,
  account_name,
  institution_name,
  is_active,
  metadata
)
SELECT 
  up.id,
  'bank'::TEXT,
  '現金'::TEXT,
  'デフォルト'::TEXT,
  true,
  '{"is_default": true, "auto_created": true}'::JSONB
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a 
  WHERE a.user_id = up.id 
  AND a.account_name = '現金'
);

-- 4. パフォーマンス向上のためのインデックス追加
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_processing_status_user ON receipts(processing_status, user_id);