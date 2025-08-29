interface CategoryRule {
  patterns: string[];
  category: string;
  categoryType: 'revenue' | 'expense';
  confidence: number;
}

// カテゴリ自動分類ルール
const CLASSIFICATION_RULES: CategoryRule[] = [
  // 収益系
  {
    patterns: ['給与', '賞与', 'ボーナス', '報酬', 'フリーランス', '売上', '入金', '振込'],
    category: '売上高',
    categoryType: 'revenue',
    confidence: 0.9
  },
  {
    patterns: ['利息', '配当', '株式', '投資'],
    category: '受取利息',
    categoryType: 'revenue',
    confidence: 0.8
  },

  // 経費・費用系
  {
    patterns: ['コンビニ', 'ファミリーマート', 'セブンイレブン', 'ローソン', 'スーパー', '食品', '弁当'],
    category: '消耗品費',
    categoryType: 'expense',
    confidence: 0.7
  },
  {
    patterns: ['Amazon', 'アマゾン', '楽天', 'ヨドバシ', 'ビックカメラ', 'PC', 'パソコン', 'Office'],
    category: '消耗品費',
    categoryType: 'expense',
    confidence: 0.8
  },
  {
    patterns: ['JR', '私鉄', '地下鉄', 'バス', 'タクシー', '交通費', '運賃', '切符', 'IC'],
    category: '旅費交通費',
    categoryType: 'expense',
    confidence: 0.9
  },
  {
    patterns: ['ガソリン', 'ENEOS', '出光', 'コスモ', 'シェル', 'ガソリンスタンド'],
    category: '旅費交通費',
    categoryType: 'expense',
    confidence: 0.8
  },
  {
    patterns: ['NTT', 'ドコモ', 'au', 'SoftBank', 'ソフトバンク', '携帯', '電話', 'インターネット', 'プロバイダ'],
    category: '通信費',
    categoryType: 'expense',
    confidence: 0.9
  },
  {
    patterns: ['電気', 'ガス', '水道', '東京電力', '関西電力', '東京ガス', '大阪ガス'],
    category: '水道光熱費',
    categoryType: 'expense',
    confidence: 0.9
  },
  {
    patterns: ['家賃', '賃料', '管理費', '共益費', 'アパート', 'マンション'],
    category: '地代家賃',
    categoryType: 'expense',
    confidence: 0.9
  },
  {
    patterns: ['会議費', '打ち合わせ', 'カフェ', 'スターバックス', 'ドトール', 'タリーズ'],
    category: '会議費',
    categoryType: 'expense',
    confidence: 0.6
  },
  {
    patterns: ['書籍', '本', '雑誌', '新聞', 'Book', 'Amazon Kindle'],
    category: '新聞図書費',
    categoryType: 'expense',
    confidence: 0.8
  },
  {
    patterns: ['修理', '修繕', 'メンテナンス', '保守'],
    category: '修繕費',
    categoryType: 'expense',
    confidence: 0.8
  },
  {
    patterns: ['税金', '市民税', '県民税', '所得税', '消費税', '固定資産税', '自動車税'],
    category: '租税公課',
    categoryType: 'expense',
    confidence: 0.9
  },
  {
    patterns: ['銀行', '手数料', '振込手数料', 'ATM'],
    category: '支払手数料',
    categoryType: 'expense',
    confidence: 0.8
  },
  {
    patterns: ['利息', '金利', 'ローン', '借入'],
    category: '支払利息',
    categoryType: 'expense',
    confidence: 0.8
  },
  {
    patterns: ['外注', '委託', 'クラウドワークス', 'ランサーズ'],
    category: '外注工賃',
    categoryType: 'expense',
    confidence: 0.8
  },
  {
    patterns: ['研修', 'セミナー', '勉強会', '講習'],
    category: '研修費',
    categoryType: 'expense',
    confidence: 0.7
  },

  // 事業関連
  {
    patterns: ['クラウド', 'AWS', 'Azure', 'GCP', 'サーバー', 'ホスティング', 'ドメイン'],
    category: '通信費',
    categoryType: 'expense',
    confidence: 0.8
  },
  {
    patterns: ['Adobe', 'Microsoft', 'Office365', 'サブスクリプション', 'ライセンス', 'ソフトウェア'],
    category: '消耗品費',
    categoryType: 'expense',
    confidence: 0.8
  },

  // デフォルト（分類できない場合）
  {
    patterns: ['その他', '不明'],
    category: '雑費',
    categoryType: 'expense',
    confidence: 0.1
  }
];

export interface ClassificationResult {
  category: string;
  categoryType: 'revenue' | 'expense';
  confidence: number;
  matchedPattern?: string;
  isBusiness: boolean;
}

export function classifyTransaction(description: string, amount: number): ClassificationResult {
  // 収入の場合の処理
  if (amount > 0) {
    for (const rule of CLASSIFICATION_RULES.filter(r => r.categoryType === 'revenue')) {
      for (const pattern of rule.patterns) {
        if (description.toLowerCase().includes(pattern.toLowerCase()) || 
            description.includes(pattern)) {
          return {
            category: rule.category,
            categoryType: rule.categoryType,
            confidence: rule.confidence,
            matchedPattern: pattern,
            isBusiness: true
          };
        }
      }
    }
    
    // 収入でパターンマッチしない場合はデフォルト
    return {
      category: '雑収入',
      categoryType: 'revenue',
      confidence: 0.5,
      isBusiness: true
    };
  }

  // 支出の場合の処理
  for (const rule of CLASSIFICATION_RULES.filter(r => r.categoryType === 'expense')) {
    for (const pattern of rule.patterns) {
      if (description.toLowerCase().includes(pattern.toLowerCase()) || 
          description.includes(pattern)) {
        return {
          category: rule.category,
          categoryType: rule.categoryType,
          confidence: rule.confidence,
          matchedPattern: pattern,
          isBusiness: isBusinessExpense(description, rule.category)
        };
      }
    }
  }

  // どのパターンにもマッチしない場合
  return {
    category: '雑費',
    categoryType: 'expense',
    confidence: 0.3,
    isBusiness: isBusinessExpense(description, '雑費')
  };
}

// 事業費判定ロジック
function isBusinessExpense(description: string, category: string): boolean {
  const businessKeywords = [
    '会議', '打ち合わせ', '出張', '研修', 'セミナー', '外注', '委託', 
    'クラウド', 'サーバー', 'ソフトウェア', 'ライセンス', 'Office',
    'Amazon', 'PC', 'パソコン', 'プリンター', 'インターネット'
  ];

  const personalKeywords = [
    'プライベート', '個人', '私用', '家族', '趣味', 'ゲーム', '娯楽',
    '映画', '漫画', '小説', '旅行', '観光'
  ];

  // 明確に個人的な支出
  for (const keyword of personalKeywords) {
    if (description.includes(keyword)) {
      return false;
    }
  }

  // 明確に事業関連
  for (const keyword of businessKeywords) {
    if (description.includes(keyword)) {
      return true;
    }
  }

  // カテゴリベースの判定
  const businessCategories = [
    '通信費', '旅費交通費', '外注工賃', '研修費', '会議費', '新聞図書費'
  ];

  if (businessCategories.includes(category)) {
    return true;
  }

  // 金額ベースの判定（高額は事業関連の可能性高）
  // この判定は呼び出し元でamountを渡すように修正が必要
  
  // デフォルトは事業関連として分類（後でユーザーが調整可能）
  return true;
}

// 複数の取引を一括で分類
export function classifyTransactions<T extends { description: string; amount: number }>(
  transactions: T[]
): Array<T & { classification: ClassificationResult }> {
  return transactions.map(transaction => ({
    ...transaction,
    classification: classifyTransaction(transaction.description, transaction.amount)
  }));
}

// 分類精度を向上させるためのユーザー定義ルール機能
export interface UserRule {
  id: string;
  pattern: string;
  category: string;
  categoryType: 'revenue' | 'expense';
  isBusiness: boolean;
  userId: string;
}

export function applyUserRules(
  description: string, 
  amount: number, 
  userRules: UserRule[]
): ClassificationResult | null {
  for (const rule of userRules) {
    if (description.toLowerCase().includes(rule.pattern.toLowerCase())) {
      return {
        category: rule.category,
        categoryType: rule.categoryType,
        confidence: 1.0,
        matchedPattern: rule.pattern,
        isBusiness: rule.isBusiness
      };
    }
  }
  return null;
}

// 改善された分類関数（ユーザールールも考慮）
export function classifyTransactionWithUserRules(
  description: string, 
  amount: number, 
  userRules: UserRule[] = []
): ClassificationResult {
  // まずユーザー定義ルールをチェック
  const userResult = applyUserRules(description, amount, userRules);
  if (userResult) {
    return userResult;
  }

  // 次にデフォルトルールで分類
  return classifyTransaction(description, amount);
}

// LocalStorageからカスタムルールを変換する関数
export function convertCustomRulesToUserRules(customRules: any[]): UserRule[] {
  return customRules
    .filter(rule => rule.enabled && rule.keyword?.trim())
    .map(rule => ({
      id: String(rule.id),
      pattern: rule.keyword,
      category: rule.category,
      categoryType: rule.isBusiness ? 'expense' : 'expense', // 簡単のため全てexpenseとする
      isBusiness: rule.isBusiness,
      userId: 'local'
    }));
}

// カスタムルールを適用した一括分類
export function classifyTransactionsWithCustomRules<T extends { description: string; amount: number }>(
  transactions: T[],
  customRules: any[] = []
): Array<T & { classification: ClassificationResult }> {
  const userRules = convertCustomRulesToUserRules(customRules);
  
  return transactions.map(transaction => ({
    ...transaction,
    classification: classifyTransactionWithUserRules(transaction.description, transaction.amount, userRules)
  }));
}