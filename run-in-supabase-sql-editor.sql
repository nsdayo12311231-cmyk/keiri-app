-- Run this SQL in Supabase Dashboard > SQL Editor
-- This will add the missing columns to the transactions table and insert seed data

-- Step 1: Add missing columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES account_categories(id),
ADD COLUMN IF NOT EXISTS transaction_type TEXT CHECK (transaction_type IN ('expense', 'revenue')) DEFAULT 'expense';

-- Step 2: Insert seed data for account categories (will skip if data already exists)
INSERT INTO account_categories (code, name, category_type, is_business) VALUES
-- 資産 (Asset)
('100', '現金', 'asset', true),
('101', '普通預金', 'asset', true),
('102', '売掛金', 'asset', true),

-- 費用 (Expense) - 事業用
('501', '仕入費', 'expense', true),
('502', '外注費', 'expense', true),
('503', '広告宣伝費', 'expense', true),
('504', '旅費交通費', 'expense', true),
('505', '通信費', 'expense', true),
('506', '水道光熱費', 'expense', true),
('507', '地代家賃', 'expense', true),
('508', '消耗品費', 'expense', true),
('509', '福利厚生費', 'expense', true),
('510', '会議費', 'expense', true),
('511', '接待交際費', 'expense', true),
('512', '減価償却費', 'expense', true),
('513', '租税公課', 'expense', true),
('514', '支払手数料', 'expense', true),
('515', '雑費', 'expense', true),

-- 収益 (Revenue) - 事業用
('401', '売上高', 'revenue', true),
('402', 'サービス売上', 'revenue', true),
('403', '雑収入', 'revenue', true),

-- 個人用費用
('601', '食費', 'expense', false),
('602', '住居費', 'expense', false),
('603', '交通費', 'expense', false),
('604', '娯楽費', 'expense', false),
('605', '被服費', 'expense', false),
('606', '医療費', 'expense', false),
('607', '教育費', 'expense', false),
('608', 'その他個人支出', 'expense', false)

ON CONFLICT (code) DO NOTHING;

-- Step 3: Verify the changes
SELECT 'Tables and columns created successfully' as status;

-- Check transactions table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name IN ('category_id', 'transaction_type')
ORDER BY column_name;

-- Check account categories count
SELECT category_type, COUNT(*) as count 
FROM account_categories 
GROUP BY category_type 
ORDER BY category_type;