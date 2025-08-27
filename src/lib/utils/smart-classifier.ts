import { supabase } from '@/lib/supabase/client';
import { autoClassifyReceipt as baseClassify } from './receipt-classifier';

interface UserLearning {
  merchantName: string;
  categoryId: string;
  categoryName: string;
  isBusiness: boolean;
  correctionCount: number;
  lastCorrected: string;
}

interface MerchantStats {
  merchantName: string;
  categoryStats: {
    [categoryName: string]: {
      count: number;
      confidence: number;
    };
  };
  totalTransactions: number;
}

export class SmartClassifier {
  private userLearnings: Map<string, UserLearning> = new Map();
  private merchantStats: Map<string, MerchantStats> = new Map();

  constructor(private userId: string) {}

  /**
   * 初期化：ユーザーの過去の修正履歴を読み込み
   */
  async initialize() {
    await Promise.all([
      this.loadUserLearnings(),
      this.loadMerchantStatistics()
    ]);
  }

  /**
   * スマート分類実行
   */
  async classifyReceipt(
    description: string,
    amount: number,
    merchantName?: string,
    ocrText?: string
  ) {
    // 1. ユーザー学習データから検索
    const userLearningResult = this.getUserLearningMatch(merchantName, description);
    if (userLearningResult && userLearningResult.confidence > 0.9) {
      return userLearningResult;
    }

    // 2. 統計ベース推論
    const statisticalResult = this.getStatisticalMatch(merchantName, description);
    if (statisticalResult && statisticalResult.confidence > 0.7) {
      return statisticalResult;
    }

    // 3. スマートキーワードマッチング
    const smartKeywordResult = this.getSmartKeywordMatch(description, merchantName, ocrText);
    if (smartKeywordResult && smartKeywordResult.confidence > 0.6) {
      return smartKeywordResult;
    }

    // 4. 基本分類にフォールバック
    return baseClassify(description, amount, merchantName, ocrText);
  }

  /**
   * ユーザーの修正を学習
   */
  async learnFromUserCorrection(
    merchantName: string,
    description: string,
    categoryId: string,
    categoryName: string,
    isBusiness: boolean
  ) {
    const key = this.getMerchantKey(merchantName, description);
    
    const existing = this.userLearnings.get(key);
    const learning: UserLearning = {
      merchantName: merchantName || '',
      categoryId,
      categoryName,
      isBusiness,
      correctionCount: (existing?.correctionCount || 0) + 1,
      lastCorrected: new Date().toISOString()
    };

    this.userLearnings.set(key, learning);
    
    // データベースに保存
    await this.saveUserLearning(key, learning);
    
    console.log(`学習データ更新: ${merchantName} → ${categoryName} (${learning.correctionCount}回目)`);
  }

  private getUserLearningMatch(merchantName?: string, description?: string) {
    if (!merchantName) return null;

    const key = this.getMerchantKey(merchantName, description);
    const learning = this.userLearnings.get(key);
    
    if (!learning) return null;

    // 修正回数に基づいて信頼度を調整
    const confidence = Math.min(0.5 + (learning.correctionCount * 0.2), 1.0);

    return {
      categoryId: learning.categoryId,
      categoryName: learning.categoryName,
      confidence,
      isBusiness: learning.isBusiness,
      matchedKeywords: [merchantName],
      reasoning: `ユーザー学習データより (${learning.correctionCount}回の修正履歴)`
    };
  }

  private getStatisticalMatch(merchantName?: string, description?: string) {
    if (!merchantName) return null;

    const stats = this.merchantStats.get(merchantName.toLowerCase());
    if (!stats || stats.totalTransactions < 3) return null;

    // 最頻出カテゴリを取得
    const mostFrequentCategory = Object.entries(stats.categoryStats)
      .reduce((best, [category, data]) => 
        data.count > (best?.data.count || 0) ? { category, data } : best
      , null as { category: string; data: { count: number; confidence: number } } | null);

    if (!mostFrequentCategory) return null;

    const { category, data } = mostFrequentCategory;
    const ratio = data.count / stats.totalTransactions;
    
    // 統計的信頼度（出現比率ベース）
    const confidence = Math.min(ratio * 0.8, 0.85);

    if (confidence < 0.5) return null;

    return {
      categoryId: this.getCategoryId(category),
      categoryName: category,
      confidence,
      isBusiness: this.isBusinessCategory(category),
      matchedKeywords: [merchantName],
      reasoning: `統計データより: この店舗の${Math.round(ratio * 100)}%が${category}に分類 (${data.count}/${stats.totalTransactions}件)`
    };
  }

  private getSmartKeywordMatch(description?: string, merchantName?: string, ocrText?: string) {
    const text = `${description || ''} ${merchantName || ''} ${ocrText || ''}`.toLowerCase();
    
    // 拡張キーワードマッピング
    const expandedKeywords = {
      '会議費': [
        'cafe', 'coffee', 'コーヒー', 'カフェ', 'meeting', 'ミーティング',
        'starbucks', 'tully', 'doutor', 'pronto', 'beck', 'veloce'
      ],
      '交通費': [
        'jr', 'train', '電車', 'station', 'metro', '地下鉄', 'taxi', 'uber'
      ],
      '通信費': [
        'docomo', 'au', 'softbank', 'mobile', 'internet', 'wifi', 'ntt'
      ],
      '消耗品費': [
        'office', 'supply', '文具', 'pen', 'paper', 'staple', 'yoshinoya'
      ]
    };

    for (const [category, keywords] of Object.entries(expandedKeywords)) {
      const matches = keywords.filter(keyword => 
        text.includes(keyword) || this.fuzzyMatch(text, keyword)
      );

      if (matches.length > 0) {
        const confidence = Math.min(0.6 + (matches.length * 0.1), 0.8);
        
        return {
          categoryId: this.getCategoryId(category),
          categoryName: category,
          confidence,
          isBusiness: true,
          matchedKeywords: matches,
          reasoning: `拡張キーワードマッチ: ${matches.join(', ')}`
        };
      }
    }

    return null;
  }

  private fuzzyMatch(text: string, keyword: string): boolean {
    // 簡易的なあいまい検索（レーベンシュタイン距離）
    const threshold = 0.8;
    const similarity = this.similarity(text, keyword);
    return similarity > threshold;
  }

  private similarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  private async loadUserLearnings() {
    try {
      const { data, error } = await supabase
        .from('user_learning_data')
        .select('*')
        .eq('user_id', this.userId);

      if (error) {
        console.log('User learning table not found, creating...');
        return;
      }

      if (data) {
        data.forEach(item => {
          this.userLearnings.set(item.merchant_key, {
            merchantName: item.merchant_name,
            categoryId: item.category_id,
            categoryName: item.category_name,
            isBusiness: item.is_business,
            correctionCount: item.correction_count,
            lastCorrected: item.last_corrected
          });
        });
      }
    } catch (error) {
      console.log('User learning data not available:', error);
    }
  }

  private async loadMerchantStatistics() {
    try {
      // 過去のtransactionsから統計を計算
      const { data, error } = await supabase
        .from('transactions')
        .select('description, category, amount')
        .eq('user_id', this.userId)
        .not('category', 'is', null);

      if (error || !data) return;

      const stats = new Map<string, MerchantStats>();
      
      data.forEach(transaction => {
        const merchant = this.extractMerchantName(transaction.description);
        if (!merchant) return;

        const key = merchant.toLowerCase();
        
        if (!stats.has(key)) {
          stats.set(key, {
            merchantName: merchant,
            categoryStats: {},
            totalTransactions: 0
          });
        }

        const merchantStat = stats.get(key)!;
        const category = transaction.category;
        
        if (!merchantStat.categoryStats[category]) {
          merchantStat.categoryStats[category] = { count: 0, confidence: 0 };
        }
        
        merchantStat.categoryStats[category].count++;
        merchantStat.totalTransactions++;
      });

      this.merchantStats = stats;
    } catch (error) {
      console.log('Merchant statistics not available:', error);
    }
  }

  private async saveUserLearning(key: string, learning: UserLearning) {
    try {
      await supabase
        .from('user_learning_data')
        .upsert({
          user_id: this.userId,
          merchant_key: key,
          merchant_name: learning.merchantName,
          category_id: learning.categoryId,
          category_name: learning.categoryName,
          is_business: learning.isBusiness,
          correction_count: learning.correctionCount,
          last_corrected: learning.lastCorrected
        });
    } catch (error) {
      console.log('Failed to save user learning:', error);
    }
  }

  private getMerchantKey(merchantName?: string, description?: string): string {
    return `${merchantName || ''}_${description?.substring(0, 20) || ''}`.toLowerCase();
  }

  private extractMerchantName(description: string): string | null {
    // 簡易的な店舗名抽出ロジック
    const patterns = [
      /^(.+?)での購入$/,
      /^(.+?)にて$/,
      /^(.+?)\s/,
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) return match[1];
    }

    return description.length > 3 ? description : null;
  }

  private getCategoryId(categoryName: string): string {
    const mapping: { [key: string]: string } = {
      '会議費': 'cat-110',
      '旅費交通費': 'cat-104',
      '通信費': 'cat-105',
      '消耗品費': 'cat-108',
      '食費': 'cat-301',
      '雑費': 'cat-115'
    };
    return mapping[categoryName] || 'cat-308';
  }

  private isBusinessCategory(categoryName: string): boolean {
    const businessCategories = ['会議費', '旅費交通費', '通信費', '消耗品費', '雑費'];
    return businessCategories.includes(categoryName);
  }
}