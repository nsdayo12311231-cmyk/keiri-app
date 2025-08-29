-- ユーザー詳細プロフィールテーブルの追加
-- 002_add_user_detailed_profiles.sql

-- ユーザー詳細情報テーブル
CREATE TABLE user_detailed_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- 基本事業情報
  detailed_business_type TEXT CHECK (detailed_business_type IN (
    'sole_proprietor',           -- 個人事業主（開業届提出済み）
    'sole_proprietor_preparing', -- 個人事業主（開業準備中）
    'freelancer',                -- フリーランス（開業届未提出）
    'side_business',             -- 副業（給与所得者の副業）
    'small_corporation',         -- 小規模法人（役員）
    'corporation_employee'       -- 法人従業員（経費精算用）
  )),
  
  -- 業種分類
  major_industry_category TEXT CHECK (major_industry_category IN (
    'it_tech',              -- IT・技術
    'creative_media',       -- クリエイティブ・メディア
    'consulting_business',  -- コンサルティング・ビジネス
    'healthcare_welfare',   -- 医療・福祉
    'education_culture',    -- 教育・文化
    'construction_real_estate', -- 建設・不動産
    'retail_commerce',      -- 小売・商業
    'food_service',         -- 飲食・サービス
    'transportation_logistics', -- 運送・物流
    'manufacturing',        -- 製造業
    'finance_insurance',    -- 金融・保険
    'agriculture_fishery',  -- 農業・漁業
    'other_services'        -- その他サービス業
  )),
  
  sub_industry_category TEXT,
  specializations TEXT[], -- 複数の専門分野
  
  -- 働き方・運営形態
  work_location_type TEXT CHECK (work_location_type IN (
    'home_office',          -- 自宅オフィス
    'coworking_space',      -- コワーキングスペース
    'client_office',        -- 客先常駐
    'rental_office',        -- 賃貸オフィス
    'mobile_work',          -- 移動が多い
    'retail_store',         -- 実店舗経営
    'workshop_factory'      -- 工房・工場
  )),
  
  client_relationship_type TEXT CHECK (client_relationship_type IN (
    'b2b_enterprise',       -- 法人向け（大企業）
    'b2b_sme',             -- 法人向け（中小企業）
    'b2c_individual',       -- 個人顧客向け
    'b2b2c_platform',       -- プラットフォーム経由
    'mixed'                 -- 混合
  )),
  
  income_stability_type TEXT CHECK (income_stability_type IN (
    'fixed_contract',       -- 固定契約（安定収入）
    'project_based',        -- プロジェクトベース
    'commission_based',     -- 成果報酬
    'seasonal',             -- 季節性あり
    'irregular'             -- 不規則
  )),
  
  -- 事業規模・体制
  has_employees BOOLEAN DEFAULT FALSE,
  employee_count INTEGER DEFAULT 0,
  uses_outsourcing BOOLEAN DEFAULT FALSE,
  
  -- 事業開始・所在地情報
  business_start_date DATE,
  prefecture TEXT,
  
  -- 税務情報
  tax_filing_type TEXT CHECK (tax_filing_type IN ('blue', 'white', 'not_decided')),
  is_taxable_entity BOOLEAN DEFAULT FALSE, -- 消費税課税事業者
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 経費設定テーブル
CREATE TABLE user_expense_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- 交通費設定
  own_car_usage TEXT CHECK (own_car_usage IN ('none', 'business_only', 'mixed')) DEFAULT 'none',
  car_business_ratio INTEGER DEFAULT 0 CHECK (car_business_ratio >= 0 AND car_business_ratio <= 100),
  public_transport_default TEXT CHECK (public_transport_default IN ('business', 'personal')) DEFAULT 'personal',
  taxi_policy TEXT CHECK (taxi_policy IN ('strict', 'flexible', 'always_ok')) DEFAULT 'flexible',
  parking_default TEXT CHECK (parking_default IN ('business', 'personal')) DEFAULT 'personal',
  
  -- 通信費設定
  phone_business_ratio INTEGER DEFAULT 0 CHECK (phone_business_ratio >= 0 AND phone_business_ratio <= 100),
  internet_business_ratio INTEGER DEFAULT 0 CHECK (internet_business_ratio >= 0 AND internet_business_ratio <= 100),
  
  -- 食事・接待費設定
  client_meeting_meals TEXT CHECK (client_meeting_meals IN ('always_business', 'case_by_case')) DEFAULT 'always_business',
  business_lunch_policy TEXT CHECK (business_lunch_policy IN ('business', 'personal')) DEFAULT 'personal',
  coffee_work_policy TEXT CHECK (coffee_work_policy IN ('business', 'personal')) DEFAULT 'personal',
  energy_drink_policy TEXT CHECK (energy_drink_policy IN ('business', 'personal')) DEFAULT 'personal',
  
  -- 学習・教育費設定
  technical_books_default TEXT CHECK (technical_books_default IN ('business', 'personal')) DEFAULT 'business',
  online_courses_default TEXT CHECK (online_courses_default IN ('business', 'personal')) DEFAULT 'business',
  conferences_default TEXT CHECK (conferences_default IN ('business', 'personal')) DEFAULT 'business',
  
  -- 設備・備品設定
  home_office_ratio INTEGER DEFAULT 0 CHECK (home_office_ratio >= 0 AND home_office_ratio <= 100),
  depreciation_threshold DECIMAL(10,2) DEFAULT 100000, -- 減価償却閾値
  
  -- カスタムルール（JSON形式で柔軟に設定）
  custom_classification_rules JSONB DEFAULT '{}',
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  -- 制約
  UNIQUE(user_id)
);

-- 税務・申告情報テーブル
CREATE TABLE user_tax_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- 税理士情報
  has_accountant BOOLEAN DEFAULT FALSE,
  accountant_name TEXT,
  accountant_fee DECIMAL(10,2),
  tax_filing_support BOOLEAN DEFAULT FALSE,
  
  -- 帳簿方式
  bookkeeping_method TEXT CHECK (bookkeeping_method IN ('simple', 'double')) DEFAULT 'simple',
  inventory_management BOOLEAN DEFAULT FALSE,
  
  -- 特別な税制適用
  startup_tax_reduction BOOLEAN DEFAULT FALSE,
  it_promotion_tax BOOLEAN DEFAULT FALSE,
  small_business_tax_rate BOOLEAN DEFAULT FALSE,
  
  -- その他設定
  notes TEXT,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  -- 制約
  UNIQUE(user_id)
);

-- インデックス作成
CREATE INDEX idx_user_detailed_profiles_user_id ON user_detailed_profiles(user_id);
CREATE INDEX idx_user_detailed_profiles_major_industry ON user_detailed_profiles(major_industry_category);
CREATE INDEX idx_user_expense_preferences_user_id ON user_expense_preferences(user_id);
CREATE INDEX idx_user_tax_info_user_id ON user_tax_info(user_id);

-- RLS (Row Level Security) 設定
ALTER TABLE user_detailed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_expense_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tax_info ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー作成
CREATE POLICY "Users can manage own detailed profile" ON user_detailed_profiles
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = user_detailed_profiles.user_id 
    AND auth.uid() = user_profiles.id
  ));

CREATE POLICY "Users can manage own expense preferences" ON user_expense_preferences
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = user_expense_preferences.user_id 
    AND auth.uid() = user_profiles.id
  ));

CREATE POLICY "Users can manage own tax info" ON user_tax_info
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = user_tax_info.user_id 
    AND auth.uid() = user_profiles.id
  ));

-- 更新時刻自動更新トリガー
CREATE TRIGGER update_user_detailed_profiles_updated_at 
  BEFORE UPDATE ON user_detailed_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_expense_preferences_updated_at 
  BEFORE UPDATE ON user_expense_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tax_info_updated_at 
  BEFORE UPDATE ON user_tax_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON TABLE user_detailed_profiles IS 'ユーザー詳細プロフィール情報（業種・働き方等）';
COMMENT ON TABLE user_expense_preferences IS 'ユーザー経費設定（カテゴリ別デフォルト設定）';
COMMENT ON TABLE user_tax_info IS 'ユーザー税務・申告情報';