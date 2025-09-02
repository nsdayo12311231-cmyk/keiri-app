-- Fix receipts table schema issues
-- Run in Supabase SQL Editor

-- 1. Fix transaction_id column type from TEXT to UUID
ALTER TABLE receipts 
ALTER COLUMN transaction_id TYPE UUID USING transaction_id::UUID;

-- 2. Add proper foreign key constraint for transaction_id
ALTER TABLE receipts 
ADD CONSTRAINT fk_receipts_transaction_id 
FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- 3. Create a default "現金" account for receipt transactions
-- First check if it exists
INSERT INTO accounts (
  id,
  user_id, 
  account_type,
  account_name,
  institution_name,
  is_active,
  metadata
)
SELECT 
  '11111111-1111-1111-1111-111111111111'::UUID,
  up.id,
  'bank'::TEXT,
  '現金'::TEXT,
  'デフォルト'::TEXT,
  true,
  '{\"is_default\": true, \"auto_created\": true}'::JSONB
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a 
  WHERE a.user_id = up.id 
  AND a.account_name = '現金'
);

-- 4. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_processing_status_user ON receipts(processing_status, user_id);