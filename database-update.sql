-- Step 1: Add new columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS transaction_type TEXT CHECK (transaction_type IN ('expense', 'revenue')) DEFAULT 'expense';

-- Step 2: Add foreign key constraint (if account_categories table exists)
-- ALTER TABLE transactions ADD CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES account_categories(id);

-- Step 3: Insert account categories seed data (run only if account_categories table exists)
INSERT INTO account_categories (id, code, name, category_type, is_business) VALUES
-- 資産 (Asset)
('cat-001', '100', '現金', 'asset', true),
('cat-002', '101', '普通預金', 'asset', true),
('cat-003', '102', '売掛金', 'asset', true),

-- 費用 (Expense) - 事業用
('cat-101', '501', '仕入費', 'expense', true),
('cat-102', '502', '外注費', 'expense', true),
('cat-103', '503', '広告宣伝費', 'expense', true),
('cat-104', '504', '旅費交通費', 'expense', true),
('cat-105', '505', '通信費', 'expense', true),
('cat-106', '506', '水道光熱費', 'expense', true),
('cat-107', '507', '地代家賃', 'expense', true),
('cat-108', '508', '消耗品費', 'expense', true),
('cat-109', '509', '福利厚生費', 'expense', true),
('cat-110', '510', '会議費', 'expense', true),
('cat-111', '511', '接待交際費', 'expense', true),
('cat-112', '512', '減価償却費', 'expense', true),
('cat-113', '513', '租税公課', 'expense', true),
('cat-114', '514', '支払手数料', 'expense', true),
('cat-115', '515', '雑費', 'expense', true),

-- 収益 (Revenue) - 事業用
('cat-201', '401', '売上高', 'revenue', true),
('cat-202', '402', 'サービス売上', 'revenue', true),
('cat-203', '403', '雑収入', 'revenue', true),

-- 個人用費用
('cat-301', '601', '食費', 'expense', false),
('cat-302', '602', '住居費', 'expense', false),
('cat-303', '603', '交通費', 'expense', false),
('cat-304', '604', '娯楽費', 'expense', false),
('cat-305', '605', '被服費', 'expense', false),
('cat-306', '606', '医療費', 'expense', false),
('cat-307', '607', '教育費', 'expense', false),
('cat-308', '608', 'その他個人支出', 'expense', false)

ON CONFLICT (id) DO NOTHING;