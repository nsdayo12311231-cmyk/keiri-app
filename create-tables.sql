-- 詳細プロフィールテーブル
CREATE TABLE user_detailed_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    detailed_business_type TEXT,
    major_industry_category TEXT,
    specific_business_type TEXT,
    work_location_type TEXT,
    business_structure TEXT,
    employee_count_range TEXT,
    annual_revenue_range TEXT,
    business_years_range TEXT,
    business_registration_status TEXT,
    prefecture TEXT,
    city TEXT,
    primary_work_style TEXT,
    business_expenses_ratio INTEGER DEFAULT 50,
    has_home_office BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id)
);

-- 経費設定テーブル
CREATE TABLE user_expense_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parking_default TEXT DEFAULT 'personal',
    taxi_default TEXT DEFAULT 'personal',
    gasoline_default TEXT DEFAULT 'personal',
    toll_default TEXT DEFAULT 'personal',
    energy_drink_policy TEXT DEFAULT 'personal',
    alcohol_policy TEXT DEFAULT 'personal',
    coffee_policy TEXT DEFAULT 'personal',
    lunch_default TEXT DEFAULT 'personal',
    dinner_default TEXT DEFAULT 'personal',
    entertainment_threshold INTEGER DEFAULT 5000,
    book_default TEXT DEFAULT 'business',
    software_default TEXT DEFAULT 'business',
    equipment_threshold INTEGER DEFAULT 30000,
    communication_default TEXT DEFAULT 'business',
    home_office_ratio INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id)
);

-- 税務情報テーブル
CREATE TABLE user_tax_info (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tax_return_method TEXT,
    accounting_method TEXT DEFAULT 'cash',
    blue_return_application BOOLEAN DEFAULT FALSE,
    tax_office_name TEXT,
    tax_accountant_name TEXT,
    tax_accountant_phone TEXT,
    tax_accountant_email TEXT,
    consumption_tax_eligible BOOLEAN DEFAULT FALSE,
    consumption_tax_method TEXT,
    special_deductions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id)
);

-- RLSポリシーを有効化
ALTER TABLE user_detailed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_expense_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tax_info ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを設定（認証されたユーザーが自分のデータのみアクセス可能）
CREATE POLICY "Users can view own detailed profile" ON user_detailed_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own detailed profile" ON user_detailed_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own detailed profile" ON user_detailed_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own detailed profile" ON user_detailed_profiles
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own expense preferences" ON user_expense_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense preferences" ON user_expense_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense preferences" ON user_expense_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense preferences" ON user_expense_preferences
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tax info" ON user_tax_info
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax info" ON user_tax_info
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax info" ON user_tax_info
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax info" ON user_tax_info
    FOR DELETE USING (auth.uid() = user_id);

-- トリガー関数：updated_atを自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atトリガーを設定
CREATE TRIGGER update_user_detailed_profiles_updated_at
    BEFORE UPDATE ON user_detailed_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_expense_preferences_updated_at
    BEFORE UPDATE ON user_expense_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tax_info_updated_at
    BEFORE UPDATE ON user_tax_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();