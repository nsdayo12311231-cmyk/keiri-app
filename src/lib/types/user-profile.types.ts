/**
 * ユーザープロフィール関連の型定義
 */

// 基本事業形態
export type DetailedBusinessType = 
  | 'sole_proprietor'           // 個人事業主（開業届提出済み）
  | 'sole_proprietor_preparing' // 個人事業主（開業準備中）
  | 'freelancer'                // フリーランス（開業届未提出）
  | 'side_business'             // 副業（給与所得者の副業）
  | 'small_corporation'         // 小規模法人（役員）
  | 'corporation_employee';     // 法人従業員（経費精算用）

// 業種大分類
export type MajorIndustryCategory = 
  | 'it_tech'                   // IT・技術
  | 'creative_media'            // クリエイティブ・メディア
  | 'consulting_business'       // コンサルティング・ビジネス
  | 'healthcare_welfare'        // 医療・福祉
  | 'education_culture'         // 教育・文化
  | 'construction_real_estate'  // 建設・不動産
  | 'retail_commerce'           // 小売・商業
  | 'food_service'              // 飲食・サービス
  | 'transportation_logistics'  // 運送・物流
  | 'manufacturing'             // 製造業
  | 'finance_insurance'         // 金融・保険
  | 'agriculture_fishery'       // 農業・漁業
  | 'other_services';           // その他サービス業

// 働く場所
export type WorkLocationType = 
  | 'home_office'               // 自宅オフィス
  | 'coworking_space'           // コワーキングスペース
  | 'client_office'             // 客先常駐
  | 'rental_office'             // 賃貸オフィス
  | 'mobile_work'               // 移動が多い
  | 'retail_store'              // 実店舗経営
  | 'workshop_factory';         // 工房・工場

// 取引先関係
export type ClientRelationshipType = 
  | 'b2b_enterprise'            // 法人向け（大企業）
  | 'b2b_sme'                   // 法人向け（中小企業）
  | 'b2c_individual'            // 個人顧客向け
  | 'b2b2c_platform'            // プラットフォーム経由
  | 'mixed';                    // 混合

// 収入安定性
export type IncomeStabilityType = 
  | 'fixed_contract'            // 固定契約（安定収入）
  | 'project_based'             // プロジェクトベース
  | 'commission_based'          // 成果報酬
  | 'seasonal'                  // 季節性あり
  | 'irregular';                // 不規則

// 申告方法
export type TaxFilingType = 'blue' | 'white' | 'not_decided';

// 帳簿方式
export type BookkeepingMethod = 'simple' | 'double';

// 経費分類設定
export type ExpensePolicy = 'business' | 'personal' | 'case_by_case';
export type CarUsageType = 'none' | 'business_only' | 'mixed';
export type TaxiPolicy = 'strict' | 'flexible' | 'always_ok';

// ユーザー詳細プロフィール
export interface UserDetailedProfile {
  id: string;
  user_id: string;
  
  // 基本事業情報
  detailed_business_type?: DetailedBusinessType;
  major_industry_category?: MajorIndustryCategory;
  sub_industry_category?: string;
  specializations?: string[];
  
  // 働き方・運営形態
  work_location_type?: WorkLocationType;
  client_relationship_type?: ClientRelationshipType;
  income_stability_type?: IncomeStabilityType;
  
  // 事業規模・体制
  has_employees?: boolean;
  employee_count?: number;
  uses_outsourcing?: boolean;
  
  // 事業開始・所在地情報
  business_start_date?: string;
  prefecture?: string;
  
  // 税務情報
  tax_filing_type?: TaxFilingType;
  is_taxable_entity?: boolean;
  
  // タイムスタンプ
  created_at: string;
  updated_at: string;
}

// 経費設定
export interface UserExpensePreferences {
  id: string;
  user_id: string;
  
  // 交通費設定
  own_car_usage?: CarUsageType;
  car_business_ratio?: number;
  public_transport_default?: ExpensePolicy;
  taxi_policy?: TaxiPolicy;
  parking_default?: ExpensePolicy;
  
  // 通信費設定
  phone_business_ratio?: number;
  internet_business_ratio?: number;
  
  // 食事・接待費設定
  client_meeting_meals?: 'always_business' | 'case_by_case';
  business_lunch_policy?: ExpensePolicy;
  coffee_work_policy?: ExpensePolicy;
  energy_drink_policy?: ExpensePolicy;
  
  // 学習・教育費設定
  technical_books_default?: ExpensePolicy;
  online_courses_default?: ExpensePolicy;
  conferences_default?: ExpensePolicy;
  
  // 設備・備品設定
  home_office_ratio?: number;
  depreciation_threshold?: number;
  
  // カスタムルール
  custom_classification_rules?: Record<string, any>;
  
  // タイムスタンプ
  created_at: string;
  updated_at: string;
}

// 税務情報
export interface UserTaxInfo {
  id: string;
  user_id: string;
  
  // 税理士情報
  has_accountant?: boolean;
  accountant_name?: string;
  accountant_fee?: number;
  tax_filing_support?: boolean;
  
  // 帳簿方式
  bookkeeping_method?: BookkeepingMethod;
  inventory_management?: boolean;
  
  // 特別な税制適用
  startup_tax_reduction?: boolean;
  it_promotion_tax?: boolean;
  small_business_tax_rate?: boolean;
  
  // その他
  notes?: string;
  
  // タイムスタンプ
  created_at: string;
  updated_at: string;
}

// 完全なユーザープロフィール（全情報統合）
export interface CompleteUserProfile {
  basic: {
    id: string;
    email: string;
    full_name?: string;
    business_type?: string;
    tax_year?: number;
  };
  detailed?: UserDetailedProfile;
  expenses?: UserExpensePreferences;
  tax?: UserTaxInfo;
}

// 業種別の中分類オプション
export const SUB_INDUSTRY_OPTIONS: Record<MajorIndustryCategory, { value: string; label: string }[]> = {
  it_tech: [
    { value: 'web_developer', label: 'Webエンジニア' },
    { value: 'mobile_developer', label: 'モバイルアプリ開発' },
    { value: 'infrastructure', label: 'インフラ・サーバー管理' },
    { value: 'data_scientist', label: 'データサイエンティスト' },
    { value: 'security_engineer', label: 'セキュリティエンジニア' },
    { value: 'pm_po', label: 'PM・PO' },
    { value: 'system_consultant', label: 'システムコンサルタント' },
    { value: 'it_instructor', label: 'IT講師・研修' },
  ],
  creative_media: [
    { value: 'web_designer', label: 'Webデザイナー' },
    { value: 'graphic_designer', label: 'グラフィックデザイナー' },
    { value: 'video_creator', label: '映像クリエイター' },
    { value: 'photographer', label: 'フォトグラファー' },
    { value: 'writer_editor', label: 'ライター・編集者' },
    { value: 'illustrator', label: 'イラストレーター' },
    { value: 'musician', label: '音楽家・作曲家' },
  ],
  consulting_business: [
    { value: 'business_consultant', label: 'ビジネスコンサルタント' },
    { value: 'management_consultant', label: '経営コンサルタント' },
    { value: 'financial_consultant', label: '財務コンサルタント' },
    { value: 'marketing_consultant', label: 'マーケティングコンサルタント' },
    { value: 'hr_consultant', label: '人事コンサルタント' },
  ],
  healthcare_welfare: [
    { value: 'doctor', label: '医師' },
    { value: 'nurse', label: '看護師' },
    { value: 'therapist', label: 'セラピスト' },
    { value: 'counselor', label: 'カウンセラー' },
    { value: 'care_worker', label: '介護士' },
  ],
  education_culture: [
    { value: 'teacher', label: '講師・教師' },
    { value: 'translator', label: '翻訳・通訳' },
    { value: 'researcher', label: '研究者' },
    { value: 'librarian', label: '司書' },
  ],
  construction_real_estate: [
    { value: 'architect', label: '建築士' },
    { value: 'contractor', label: '工事業者' },
    { value: 'real_estate_agent', label: '不動産業者' },
    { value: 'interior_designer', label: 'インテリアデザイナー' },
  ],
  retail_commerce: [
    { value: 'online_shop', label: 'ECショップ運営' },
    { value: 'retail_store', label: '小売店経営' },
    { value: 'import_export', label: '輸入・輸出業' },
  ],
  food_service: [
    { value: 'restaurant', label: 'レストラン経営' },
    { value: 'cafe', label: 'カフェ経営' },
    { value: 'catering', label: 'ケータリング' },
    { value: 'food_delivery', label: 'フードデリバリー' },
  ],
  transportation_logistics: [
    { value: 'delivery', label: '配送業' },
    { value: 'logistics', label: '物流業' },
    { value: 'taxi_driver', label: 'タクシー運転手' },
  ],
  manufacturing: [
    { value: 'craftsman', label: '工芸・手工業' },
    { value: 'factory', label: '製造業' },
  ],
  finance_insurance: [
    { value: 'financial_planner', label: 'ファイナンシャルプランナー' },
    { value: 'insurance_agent', label: '保険代理店' },
  ],
  agriculture_fishery: [
    { value: 'farmer', label: '農業' },
    { value: 'fisherman', label: '漁業' },
  ],
  other_services: [
    { value: 'cleaning', label: 'クリーニング業' },
    { value: 'beauty', label: '美容業' },
    { value: 'repair', label: '修理業' },
    { value: 'other', label: 'その他' },
  ],
};

// 都道府県リスト
export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];