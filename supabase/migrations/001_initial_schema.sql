-- Keiri App 初期データベーススキーマ
-- 実行手順: Supabase Dashboard > SQL Editor で実行

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM public;

-- ユーザープロフィール拡張テーブル
-- auth.users テーブルと連携
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  business_type TEXT CHECK (business_type IN ('individual', 'freelancer', 'small_business')),
  tax_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 連携アカウント情報テーブル
CREATE TABLE accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'credit_card', 'ec_site', 'digital_wallet', 'crypto_exchange')),
  account_name TEXT NOT NULL,
  institution_name TEXT,
  account_number TEXT, -- 暗号化推奨
  is_active BOOLEAN DEFAULT TRUE,
  sync_enabled BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 勘定科目マスターテーブル
CREATE TABLE account_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- 例: '401', '501'
  name TEXT NOT NULL, -- 例: '売上高', '仕入高'
  category_type TEXT NOT NULL CHECK (category_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  is_business BOOLEAN DEFAULT TRUE, -- 事業用かどうか
  parent_id UUID REFERENCES account_categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 取引データテーブル
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  category_id UUID REFERENCES account_categories(id),
  is_business BOOLEAN DEFAULT TRUE,
  tax_category TEXT, -- 課税、非課税、免税等
  receipt_url TEXT, -- レシート画像のURL
  confidence_score DECIMAL(3,2) DEFAULT 1.0, -- AI判定の確信度 (0.0-1.0)
  is_confirmed BOOLEAN DEFAULT FALSE, -- ユーザーによる確認済みかどうか
  external_id TEXT, -- 外部システムとの連携ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 仕訳エントリテーブル（複式簿記対応）
CREATE TABLE journal_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT, -- 伝票番号
  total_amount DECIMAL(15,2) NOT NULL,
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 仕訳明細テーブル
CREATE TABLE journal_entry_lines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_category_id UUID REFERENCES account_categories(id) NOT NULL,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- インデックス作成
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entry_lines_journal_id ON journal_entry_lines(journal_entry_id);

-- Row Level Security (RLS) 設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー作成
-- ユーザープロフィール: 自分のデータのみアクセス可能
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- アカウント: ユーザーは自分のアカウントのみアクセス可能
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- 取引: ユーザーは自分の取引のみアクセス可能
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- 仕訳: ユーザーは自分の仕訳のみアクセス可能
CREATE POLICY "Users can manage own journal entries" ON journal_entries
  FOR ALL USING (auth.uid() = user_id);

-- 仕訳明細: 関連する仕訳の所有者のみアクセス可能
CREATE POLICY "Users can manage own journal entry lines" ON journal_entry_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journal_entries 
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id 
      AND journal_entries.user_id = auth.uid()
    )
  );

-- 勘定科目: 全ユーザー読み取り可能（マスターデータ）
CREATE POLICY "All users can view account categories" ON account_categories
  FOR SELECT USING (TRUE);

-- 更新時刻自動更新用の関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新時刻自動更新トリガー
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 基本的な勘定科目データ投入
INSERT INTO account_categories (code, name, category_type, is_business) VALUES
-- 資産
('101', '現金', 'asset', TRUE),
('102', '普通預金', 'asset', TRUE),
('103', '当座預金', 'asset', TRUE),
('111', '売掛金', 'asset', TRUE),
('112', '受取手形', 'asset', TRUE),
('121', '棚卸資産', 'asset', TRUE),
('131', '建物', 'asset', TRUE),
('132', '機械装置', 'asset', TRUE),
('133', '工具器具備品', 'asset', TRUE),

-- 負債
('201', '買掛金', 'liability', TRUE),
('202', '支払手形', 'liability', TRUE),
('211', '短期借入金', 'liability', TRUE),
('212', '長期借入金', 'liability', TRUE),
('221', '未払金', 'liability', TRUE),
('222', '未払費用', 'liability', TRUE),

-- 純資産
('301', '元入金', 'equity', TRUE),
('302', '事業主借', 'equity', TRUE),
('303', '事業主貸', 'equity', TRUE),

-- 収益
('401', '売上高', 'revenue', TRUE),
('402', '受取利息', 'revenue', TRUE),
('403', '雑収入', 'revenue', TRUE),

-- 費用
('501', '仕入高', 'expense', TRUE),
('502', '給料賃金', 'expense', TRUE),
('503', '外注工賃', 'expense', TRUE),
('504', '減価償却費', 'expense', TRUE),
('505', '地代家賃', 'expense', TRUE),
('506', '水道光熱費', 'expense', TRUE),
('507', '旅費交通費', 'expense', TRUE),
('508', '通信費', 'expense', TRUE),
('509', '消耗品費', 'expense', TRUE),
('510', '修繕費', 'expense', TRUE),
('511', '租税公課', 'expense', TRUE),
('512', '支払利息', 'expense', TRUE),
('513', '雑費', 'expense', TRUE);

-- ビューの作成（よく使用されるデータの組み合わせ）
CREATE VIEW transaction_summary AS
SELECT 
  t.id,
  t.user_id,
  t.amount,
  t.description,
  t.transaction_date,
  t.is_business,
  t.is_confirmed,
  a.account_name,
  a.account_type,
  ac.name as category_name,
  ac.category_type
FROM transactions t
LEFT JOIN accounts a ON t.account_id = a.id
LEFT JOIN account_categories ac ON t.category_id = ac.id;

COMMENT ON TABLE user_profiles IS 'ユーザープロフィール情報';
COMMENT ON TABLE accounts IS '連携アカウント情報（銀行、カード等）';
COMMENT ON TABLE account_categories IS '勘定科目マスターデータ';
COMMENT ON TABLE transactions IS '取引データ';
COMMENT ON TABLE journal_entries IS '仕訳エントリ（複式簿記）';
COMMENT ON TABLE journal_entry_lines IS '仕訳明細';
COMMENT ON VIEW transaction_summary IS '取引データサマリービュー';