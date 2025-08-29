/**
 * 高度な経費分類エンジン
 * ユーザーのプロフィールと設定に基づいて、精密な経費自動分類を実行
 */

import type { 
  UserDetailedProfile,
  UserExpensePreferences,
  MajorIndustryCategory 
} from '@/lib/types/user-profile.types';

export interface TransactionData {
  id?: string;
  description: string;
  amount: number;
  date: string;
  merchantName?: string;
  location?: string;
  time?: string;
  ocrText?: string;
}

export interface ClassificationResult {
  categoryName: string;
  isBusiness: boolean;
  confidence: number; // 0-100
  reason: string;
  suggestedNotes?: string;
  businessRatio?: number; // 按分比率（混合の場合）
}

/**
 * 業種別キーワード辞書
 */
const INDUSTRY_KEYWORDS: Record<MajorIndustryCategory, {
  business: string[];
  tools: string[];
  education: string[];
  travel: string[];
}> = {
  it_tech: {
    business: ['GitHub', 'AWS', 'Azure', 'GCP', 'Heroku', 'Vercel', 'Docker', 'Kubernetes'],
    tools: ['IDE', 'エディター', '開発ツール', 'Postman', 'Figma', 'Sketch'],
    education: ['Udemy', 'Coursera', '技術書', 'O\'Reilly', 'プログラミング', '勉強会'],
    travel: ['技術カンファレンス', 'ハッカソン', '勉強会', '客先'],
  },
  creative_media: {
    business: ['Adobe', 'Creative Cloud', 'Photoshop', 'Illustrator', 'Premiere', 'After Effects'],
    tools: ['カメラ', 'レンズ', 'マイク', '照明', '三脚', '編集'],
    education: ['デザイン書', 'アート', '展示会', 'ギャラリー', '美術館'],
    travel: ['撮影', '取材', 'ロケ', '展示会'],
  },
  consulting_business: {
    business: ['コンサルティング', '戦略', '提案', 'プレゼン', '企画'],
    tools: ['スーツ', 'ビジネスバッグ', 'プレゼンツール', 'PowerPoint'],
    education: ['MBA', 'ビジネス書', '経営', 'マネジメント', 'セミナー'],
    travel: ['出張', '客先訪問', '会議', '商談'],
  },
  healthcare_welfare: {
    business: ['医療', '診察', '治療', 'カウンセリング', 'セラピー'],
    tools: ['医療機器', '白衣', '聴診器', '器具'],
    education: ['医学書', '研修', '学会', '症例'],
    travel: ['往診', '学会', '研修'],
  },
  education_culture: {
    business: ['教育', '講義', '授業', '指導', '添削'],
    tools: ['教材', 'テキスト', 'ホワイトボード', 'プロジェクター'],
    education: ['専門書', '資格', '研修', '学会'],
    travel: ['出張授業', '研修', '学会'],
  },
  construction_real_estate: {
    business: ['建築', '設計', '工事', '施工', '不動産'],
    tools: ['工具', '測定器', '安全用品', 'CAD', '図面'],
    education: ['建築書', '法規', '資格', '技術'],
    travel: ['現場', '物件', '工事現場'],
  },
  retail_commerce: {
    business: ['仕入れ', '在庫', '販売', 'ECサイト', 'ショップ'],
    tools: ['POSレジ', '包装材', 'ラベル', '梱包'],
    education: ['マーケティング', '販売', '商品知識'],
    travel: ['仕入れ', '展示会', '商談'],
  },
  food_service: {
    business: ['食材', '調理', '厨房', 'レストラン', 'カフェ'],
    tools: ['調理器具', '食器', '制服', '冷蔵庫'],
    education: ['料理', 'レシピ', '食品衛生', '調理技術'],
    travel: ['食材仕入れ', '研修', '料理教室'],
  },
  transportation_logistics: {
    business: ['配送', '運送', '物流', 'ドライバー'],
    tools: ['車両', 'GPS', '梱包', 'ガソリン'],
    education: ['運転', '物流', '安全'],
    travel: ['配送', '営業所'],
  },
  manufacturing: {
    business: ['製造', '生産', '工場', '品質管理'],
    tools: ['機械', '工具', '部品', '材料'],
    education: ['技術書', '品質管理', '安全'],
    travel: ['工場', '取引先', '展示会'],
  },
  finance_insurance: {
    business: ['金融', '保険', '投資', 'ファイナンシャルプランニング'],
    tools: ['電卓', '資料', '契約書', 'スーツ'],
    education: ['金融', '保険', '投資', 'FP', '資格'],
    travel: ['顧客訪問', '研修', 'セミナー'],
  },
  agriculture_fishery: {
    business: ['農業', '漁業', '作物', '魚', '畜産'],
    tools: ['農機具', '種子', '肥料', '農薬', '餌'],
    education: ['農業技術', '品種改良', '病害虫'],
    travel: ['市場', '農協', '研修'],
  },
  other_services: {
    business: ['サービス', 'クリーニング', '美容', '修理'],
    tools: ['専用機器', '工具', '材料', '消耗品'],
    education: ['技術', '資格', '研修'],
    travel: ['顧客', '研修', 'セミナー'],
  },
};

/**
 * 時間帯による分類ヒント
 */
const TIME_CLASSIFICATION_HINTS = {
  businessHours: { start: 9, end: 18 }, // 9:00-18:00
  lunchTime: { start: 11, end: 14 },    // 11:00-14:00
  eveningMeeting: { start: 18, end: 22 } // 18:00-22:00
};

/**
 * 高度な経費分類器
 */
export class AdvancedExpenseClassifier {
  constructor(
    private userProfile?: UserDetailedProfile,
    private userPreferences?: UserExpensePreferences
  ) {}

  /**
   * メイン分類実行
   */
  classify(transaction: TransactionData): ClassificationResult {
    const results: ClassificationResult[] = [];

    // 1. 業種特化分類
    results.push(this.classifyByIndustry(transaction));

    // 2. 個人設定ベース分類
    results.push(this.classifyByUserPreferences(transaction));

    // 3. 時間・場所ベース分類
    results.push(this.classifyByContextualHints(transaction));

    // 4. 金額ベース分類
    results.push(this.classifyByAmount(transaction));

    // 5. キーワードベース分類（フォールバック）
    results.push(this.classifyByKeywords(transaction));

    // 最も信頼度の高い結果を選択
    return this.selectBestResult(results);
  }

  /**
   * 業種に基づく分類
   */
  private classifyByIndustry(transaction: TransactionData): ClassificationResult {
    if (!this.userProfile?.major_industry_category) {
      return this.getDefaultResult(transaction);
    }

    const industry = this.userProfile.major_industry_category;
    const keywords = INDUSTRY_KEYWORDS[industry];
    const text = `${transaction.description} ${transaction.merchantName || ''} ${transaction.ocrText || ''}`.toLowerCase();

    // 業種専用ツール・サービスの検出
    for (const keyword of keywords.business) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          categoryName: this.mapToAccountingCategory(keyword, 'business'),
          isBusiness: true,
          confidence: 90,
          reason: `${industry}業界の専門ツール・サービスとして判定`,
          suggestedNotes: `${keyword}の利用料金`
        };
      }
    }

    // 教育・学習関連
    for (const keyword of keywords.education) {
      if (text.includes(keyword.toLowerCase())) {
        const policy = this.userPreferences?.technical_books_default || 'business';
        return {
          categoryName: '研修費',
          isBusiness: policy === 'business',
          confidence: 85,
          reason: `${industry}業界の専門教育として判定`,
          suggestedNotes: `専門分野の学習費用`
        };
      }
    }

    // 移動・交通関連
    for (const keyword of keywords.travel) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          categoryName: '旅費交通費',
          isBusiness: true,
          confidence: 88,
          reason: `${industry}業界の業務移動として判定`,
          suggestedNotes: `${keyword}関連の移動費`
        };
      }
    }

    return this.getDefaultResult(transaction);
  }

  /**
   * ユーザー設定に基づく分類
   */
  private classifyByUserPreferences(transaction: TransactionData): ClassificationResult {
    if (!this.userPreferences) {
      return this.getDefaultResult(transaction);
    }

    const text = transaction.description.toLowerCase();
    const merchant = transaction.merchantName?.toLowerCase() || '';

    // 交通費の詳細分類
    if (this.isTransportation(text, merchant)) {
      return this.classifyTransportation(transaction);
    }

    // 食事・飲食の詳細分類
    if (this.isFoodDrink(text, merchant)) {
      return this.classifyFoodDrink(transaction);
    }

    // 通信費の詳細分類
    if (this.isCommunication(text, merchant)) {
      return this.classifyCommunication(transaction);
    }

    // 教育・学習費の詳細分類
    if (this.isEducation(text, merchant)) {
      return this.classifyEducation(transaction);
    }

    return this.getDefaultResult(transaction);
  }

  /**
   * 文脈情報による分類
   */
  private classifyByContextualHints(transaction: TransactionData): ClassificationResult {
    const hour = this.extractHour(transaction.time);
    const isBusinessHour = hour >= TIME_CLASSIFICATION_HINTS.businessHours.start && 
                          hour <= TIME_CLASSIFICATION_HINTS.businessHours.end;
    const isLunchTime = hour >= TIME_CLASSIFICATION_HINTS.lunchTime.start && 
                       hour <= TIME_CLASSIFICATION_HINTS.lunchTime.end;

    // ランチタイムの食事判定
    if (isLunchTime && this.isFoodDrink(transaction.description, transaction.merchantName || '')) {
      const policy = this.userPreferences?.business_lunch_policy || 'personal';
      return {
        categoryName: policy === 'business' ? '会議費' : '事業主貸',
        isBusiness: policy === 'business',
        confidence: 75,
        reason: `ランチタイム（${hour}時）の食事として判定`,
        suggestedNotes: '昼食代'
      };
    }

    // 営業時間外の支出（個人利用の可能性高）
    if (!isBusinessHour && !this.isBusinessRelatedKeyword(transaction.description)) {
      return {
        categoryName: '事業主貸',
        isBusiness: false,
        confidence: 60,
        reason: '営業時間外の支出として判定',
        suggestedNotes: '個人利用の可能性'
      };
    }

    return this.getDefaultResult(transaction);
  }

  /**
   * 金額による分類
   */
  private classifyByAmount(transaction: TransactionData): ClassificationResult {
    const amount = Math.abs(transaction.amount);
    const threshold = this.userPreferences?.depreciation_threshold || 100000;

    // 高額設備投資の判定
    if (amount >= threshold && this.isEquipment(transaction.description)) {
      return {
        categoryName: '工具器具備品',
        isBusiness: true,
        confidence: 85,
        reason: `高額設備投資（${amount.toLocaleString()}円）として判定`,
        suggestedNotes: '減価償却対象の可能性'
      };
    }

    // 少額支出の簡易判定
    if (amount < 500) {
      return {
        categoryName: '消耗品費',
        isBusiness: true,
        confidence: 70,
        reason: '少額支出として事業経費に分類',
        suggestedNotes: '少額消耗品'
      };
    }

    return this.getDefaultResult(transaction);
  }

  /**
   * キーワードベース分類（フォールバック）
   */
  private classifyByKeywords(transaction: TransactionData): ClassificationResult {
    const text = `${transaction.description} ${transaction.merchantName || ''}`.toLowerCase();

    // 基本的なキーワードマッピング
    const keywordMap: { [key: string]: { category: string; isBusiness: boolean; confidence: number } } = {
      'タクシー|taxi': { category: '旅費交通費', isBusiness: true, confidence: 80 },
      '駅|電車|jr|新幹線|地下鉄|バス': { category: '旅費交通費', isBusiness: true, confidence: 85 },
      'スターバックス|カフェ|コーヒー': { category: '会議費', isBusiness: true, confidence: 65 },
      'レッドブル|モンスター|エナジー': { 
        category: this.userPreferences?.energy_drink_policy === 'business' ? '会議費' : '事業主貸',
        isBusiness: this.userPreferences?.energy_drink_policy === 'business',
        confidence: 70
      },
      'amazon|アマゾン': { category: '消耗品費', isBusiness: true, confidence: 60 },
      '本|書籍': { category: '研修費', isBusiness: true, confidence: 75 },
    };

    for (const [pattern, result] of Object.entries(keywordMap)) {
      if (new RegExp(pattern, 'i').test(text)) {
        return {
          categoryName: result.category,
          isBusiness: result.isBusiness,
          confidence: result.confidence,
          reason: 'キーワードパターンマッチング',
          suggestedNotes: `「${pattern}」パターンで分類`
        };
      }
    }

    return this.getDefaultResult(transaction);
  }

  /**
   * 交通費分類の詳細処理
   */
  private classifyTransportation(transaction: TransactionData): ClassificationResult {
    const text = transaction.description.toLowerCase();

    // タクシーの場合
    if (/タクシー|taxi/i.test(text)) {
      const policy = this.userPreferences?.taxi_policy || 'flexible';
      let confidence = 70;
      
      if (policy === 'always_ok') confidence = 90;
      else if (policy === 'strict') confidence = 50;

      return {
        categoryName: '旅費交通費',
        isBusiness: true,
        confidence,
        reason: `タクシー利用方針: ${policy}`,
        suggestedNotes: 'タクシー代'
      };
    }

    // 駐車場の場合
    if (/駐車|パーキング/i.test(text)) {
      const isBusinessDefault = this.userPreferences?.parking_default === 'business';
      return {
        categoryName: '旅費交通費',
        isBusiness: isBusinessDefault,
        confidence: 80,
        reason: '駐車場代の設定に基づく',
        suggestedNotes: '駐車場代'
      };
    }

    // 公共交通機関
    const isBusinessDefault = this.userPreferences?.public_transport_default === 'business';
    return {
      categoryName: '旅費交通費',
      isBusiness: isBusinessDefault,
      confidence: 85,
      reason: '公共交通機関の設定に基づく',
      suggestedNotes: '交通費'
    };
  }

  /**
   * 食事・飲食分類の詳細処理
   */
  private classifyFoodDrink(transaction: TransactionData): ClassificationResult {
    const text = transaction.description.toLowerCase();
    const merchant = transaction.merchantName?.toLowerCase() || '';

    // 取引先との会食判定
    if (/会食|接待|商談|打ち合わせ|会議/i.test(text)) {
      const policy = this.userPreferences?.client_meeting_meals || 'always_business';
      return {
        categoryName: '会議費',
        isBusiness: policy === 'always_business',
        confidence: 90,
        reason: '取引先との会食として判定',
        suggestedNotes: '接待交際費'
      };
    }

    // カフェでの作業
    if (/カフェ|コーヒー|スタバ/i.test(merchant)) {
      const policy = this.userPreferences?.coffee_work_policy || 'personal';
      return {
        categoryName: policy === 'business' ? '会議費' : '事業主貸',
        isBusiness: policy === 'business',
        confidence: 70,
        reason: 'カフェ利用の設定に基づく',
        suggestedNotes: 'カフェ代（作業場所として利用）'
      };
    }

    // エナジードリンク等
    if (/エナジー|レッドブル|モンスター|栄養ドリンク/i.test(text)) {
      const policy = this.userPreferences?.energy_drink_policy || 'personal';
      return {
        categoryName: policy === 'business' ? '会議費' : '事業主貸',
        isBusiness: policy === 'business',
        confidence: 75,
        reason: 'エナジードリンクの設定に基づく',
        suggestedNotes: '集中力向上のための飲料'
      };
    }

    // その他の食事
    return {
      categoryName: '事業主貸',
      isBusiness: false,
      confidence: 60,
      reason: '一般的な食事として個人支出に分類',
      suggestedNotes: '食事代'
    };
  }

  /**
   * 通信費分類の詳細処理
   */
  private classifyCommunication(transaction: TransactionData): ClassificationResult {
    const businessRatio = this.userPreferences?.phone_business_ratio || 0;
    
    if (businessRatio > 0) {
      return {
        categoryName: '通信費',
        isBusiness: true,
        confidence: 85,
        reason: `事業使用割合 ${businessRatio}% で按分`,
        businessRatio: businessRatio / 100,
        suggestedNotes: `通信費（事業割合${businessRatio}%）`
      };
    }

    return {
      categoryName: '事業主貸',
      isBusiness: false,
      confidence: 70,
      reason: '個人利用として分類',
      suggestedNotes: '個人の通信費'
    };
  }

  /**
   * 教育費分類の詳細処理
   */
  private classifyEducation(transaction: TransactionData): ClassificationResult {
    const policy = this.userPreferences?.technical_books_default || 'business';
    
    return {
      categoryName: '研修費',
      isBusiness: policy === 'business',
      confidence: 85,
      reason: '教育・学習費の設定に基づく',
      suggestedNotes: '専門知識向上のための費用'
    };
  }

  /**
   * 最適な分類結果を選択
   */
  private selectBestResult(results: ClassificationResult[]): ClassificationResult {
    // 信頼度でソートし、最も高いものを選択
    return results
      .filter(r => r.confidence > 50) // 信頼度50%以下は除外
      .sort((a, b) => b.confidence - a.confidence)[0] || this.getDefaultResult();
  }

  /**
   * デフォルト結果
   */
  private getDefaultResult(transaction?: TransactionData): ClassificationResult {
    return {
      categoryName: '雑費',
      isBusiness: false,
      confidence: 30,
      reason: '分類できないため雑費として処理',
      suggestedNotes: '要確認'
    };
  }

  // ヘルパーメソッド群
  private isTransportation(description: string, merchant: string): boolean {
    return /タクシー|taxi|駅|電車|jr|新幹線|地下鉄|バス|駐車|パーキング/i.test(`${description} ${merchant}`);
  }

  private isFoodDrink(description: string, merchant: string): boolean {
    return /カフェ|コーヒー|レストラン|食事|飲食|スタバ|マック|エナジー/i.test(`${description} ${merchant}`);
  }

  private isCommunication(description: string, merchant: string): boolean {
    return /docomo|au|softbank|楽天|電話|通信|携帯|スマホ|プロバイダ|インターネット/i.test(`${description} ${merchant}`);
  }

  private isEducation(description: string, merchant: string): boolean {
    return /本|書籍|udemy|coursera|セミナー|研修|勉強会|講座|スクール/i.test(`${description} ${merchant}`);
  }

  private isEquipment(description: string): boolean {
    return /pc|パソコン|コンピューター|モニター|机|椅子|プリンター|カメラ|機材/i.test(description);
  }

  private isBusinessRelatedKeyword(description: string): boolean {
    return /会議|商談|打ち合わせ|営業|プレゼン|企画|開発|設計|制作/i.test(description);
  }

  private extractHour(timeString?: string): number {
    if (!timeString) return 12; // デフォルト値
    const match = timeString.match(/(\d{1,2})[:\s]?(\d{2})?/);
    return match ? parseInt(match[1]) : 12;
  }

  private mapToAccountingCategory(keyword: string, type: 'business' | 'tool' | 'education'): string {
    // キーワードを適切な勘定科目にマッピング
    const mappings: { [key: string]: string } = {
      'GitHub': '通信費',
      'AWS': '通信費', 
      'Adobe': 'ソフトウェア費',
      'スーツ': '消耗品費',
      'カメラ': '工具器具備品',
      '書籍': '研修費',
    };
    
    return mappings[keyword] || '雑費';
  }
}

/**
 * シングルトンインスタンス用のファクトリー
 */
export function createAdvancedClassifier(
  userProfile?: UserDetailedProfile,
  userPreferences?: UserExpensePreferences
): AdvancedExpenseClassifier {
  return new AdvancedExpenseClassifier(userProfile, userPreferences);
}