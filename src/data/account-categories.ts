export interface AccountCategory {
  id: string;
  code: string;
  name: string;
  category_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  is_business: boolean;
  parent_id?: string;
}

export const ACCOUNT_CATEGORIES: AccountCategory[] = [
  // 資産 (Asset)
  {
    id: 'cat-001',
    code: '100',
    name: '現金',
    category_type: 'asset',
    is_business: true
  },
  {
    id: 'cat-002',
    code: '101',
    name: '普通預金',
    category_type: 'asset',
    is_business: true
  },
  {
    id: 'cat-003',
    code: '102',
    name: '売掛金',
    category_type: 'asset',
    is_business: true
  },

  // 費用 (Expense) - 事業用
  {
    id: 'cat-101',
    code: '501',
    name: '仕入費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-102',
    code: '502',
    name: '外注費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-103',
    code: '503',
    name: '広告宣伝費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-104',
    code: '504',
    name: '旅費交通費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-105',
    code: '505',
    name: '通信費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-106',
    code: '506',
    name: '水道光熱費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-107',
    code: '507',
    name: '地代家賃',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-108',
    code: '508',
    name: '消耗品費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-109',
    code: '509',
    name: '福利厚生費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-110',
    code: '510',
    name: '会議費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-111',
    code: '511',
    name: '接待交際費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-112',
    code: '512',
    name: '減価償却費',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-113',
    code: '513',
    name: '租税公課',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-114',
    code: '514',
    name: '支払手数料',
    category_type: 'expense',
    is_business: true
  },
  {
    id: 'cat-115',
    code: '515',
    name: '雑費',
    category_type: 'expense',
    is_business: true
  },

  // 収益 (Revenue) - 事業用
  {
    id: 'cat-201',
    code: '401',
    name: '売上高',
    category_type: 'revenue',
    is_business: true
  },
  {
    id: 'cat-202',
    code: '402',
    name: 'サービス売上',
    category_type: 'revenue',
    is_business: true
  },
  {
    id: 'cat-203',
    code: '403',
    name: '雑収入',
    category_type: 'revenue',
    is_business: true
  },

  // 個人用費用
  {
    id: 'cat-301',
    code: '601',
    name: '食費',
    category_type: 'expense',
    is_business: false
  },
  {
    id: 'cat-302',
    code: '602',
    name: '住居費',
    category_type: 'expense',
    is_business: false
  },
  {
    id: 'cat-303',
    code: '603',
    name: '交通費',
    category_type: 'expense',
    is_business: false
  },
  {
    id: 'cat-304',
    code: '604',
    name: '娯楽費',
    category_type: 'expense',
    is_business: false
  },
  {
    id: 'cat-305',
    code: '605',
    name: '被服費',
    category_type: 'expense',
    is_business: false
  },
  {
    id: 'cat-306',
    code: '606',
    name: '医療費',
    category_type: 'expense',
    is_business: false
  },
  {
    id: 'cat-307',
    code: '607',
    name: '教育費',
    category_type: 'expense',
    is_business: false
  },
  {
    id: 'cat-308',
    code: '608',
    name: 'その他個人支出',
    category_type: 'expense',
    is_business: false
  }
];

// データベースから動的に取得する関数（実装用）
export const fetchAccountCategories = async (supabase: any) => {
  const { data, error } = await supabase
    .from('account_categories')
    .select('*')
    .eq('is_active', true)
    .order('code');
  
  if (error) throw error;
  return data || [];
};

export const fetchExpenseCategories = async (supabase: any, isBusiness: boolean) => {
  const { data, error } = await supabase
    .from('account_categories')
    .select('*')
    .eq('category_type', 'expense')
    .eq('is_business', isBusiness)
    .eq('is_active', true)
    .order('code');
  
  if (error) throw error;
  return data || [];
};

export const fetchRevenueCategories = async (supabase: any, isBusiness: boolean) => {
  const { data, error } = await supabase
    .from('account_categories')
    .select('*')
    .eq('category_type', 'revenue')
    .eq('is_business', isBusiness)
    .eq('is_active', true)
    .order('code');
  
  if (error) throw error;
  return data || [];
};

// フォールバック用の静的データ
export const getAccountCategoriesByType = (isBusiness: boolean): AccountCategory[] => {
  return ACCOUNT_CATEGORIES.filter(category => category.is_business === isBusiness);
};

export const getExpenseCategories = (isBusiness: boolean): AccountCategory[] => {
  return ACCOUNT_CATEGORIES.filter(
    category => category.category_type === 'expense' && category.is_business === isBusiness
  );
};

export const getRevenueCategories = (isBusiness: boolean): AccountCategory[] => {
  return ACCOUNT_CATEGORIES.filter(
    category => category.category_type === 'revenue' && category.is_business === isBusiness
  );
};