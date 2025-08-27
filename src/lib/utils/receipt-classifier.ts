import { AccountCategory, ACCOUNT_CATEGORIES } from '@/data/account-categories';

export interface ClassificationRule {
  keywords: string[];
  categoryId: string;
  categoryName: string;
  confidence: number;
  isBusiness: boolean;
}

// 自動分類ルール定義
const CLASSIFICATION_RULES: ClassificationRule[] = [
  // 事業用 - 旅費交通費
  {
    keywords: ['電車', '地下鉄', 'JR', '新幹線', 'タクシー', 'バス', '駐車場', 'パーキング', 'ガソリン', 'ETC', 'ENEOS', 'Shell', 'JOMO', '出光'],
    categoryId: 'cat-104',
    categoryName: '旅費交通費',
    confidence: 0.9,
    isBusiness: true
  },

  // 事業用 - 通信費
  {
    keywords: ['NTT', 'ドコモ', 'au', 'ソフトバンク', 'Y!mobile', '楽天モバイル', 'インターネット', 'プロバイダ', '電話料金', 'Wi-Fi'],
    categoryId: 'cat-105',
    categoryName: '通信費',
    confidence: 0.9,
    isBusiness: true
  },

  // 事業用 - 消耗品費
  {
    keywords: ['文房具', 'ボールペン', 'ノート', 'コピー用紙', 'プリンター', 'インク', '電池', 'USB', 'マウス', 'キーボード', '事務用品', 'ステープラー'],
    categoryId: 'cat-108',
    categoryName: '消耗品費',
    confidence: 0.8,
    isBusiness: true
  },

  // 事業用 - 会議費
  {
    keywords: ['コーヒー', 'カフェ', 'CAFE', 'Coffee', 'coffee', 'スタバ', 'タリーズ', 'ドトール', '会議室', '貸会議室', '打合せ', 'ラペ', 'キーフェル', 'ベローチェ', 'エクセルシオール', '珈琲館', 'カフェベローチェ', 'サンマルクカフェ', 'エナジー', 'レッドブル', 'モンスター', 'リポビタン', 'energy', 'redbull', 'monster'],
    categoryId: 'cat-110',
    categoryName: '会議費',
    confidence: 0.7,
    isBusiness: true
  },

  // 事業用 - 接待交際費
  {
    keywords: ['居酒屋', '焼肉', '寿司', 'レストラン', '接待', 'お祝い', 'ギフト', 'お中元', 'お歳暮'],
    categoryId: 'cat-111',
    categoryName: '接待交際費',
    confidence: 0.8,
    isBusiness: true
  },

  // 事業用 - 広告宣伝費
  {
    keywords: ['Google', 'Facebook', 'Instagram', '広告', 'チラシ', 'ポスター', 'パンフレット', 'DM', 'Yahoo'],
    categoryId: 'cat-103',
    categoryName: '広告宣伝費',
    confidence: 0.9,
    isBusiness: true
  },

  // 事業用 - 水道光熱費
  {
    keywords: ['電気代', 'ガス代', '水道代', '東京電力', '東京ガス', '関西電力', '中部電力'],
    categoryId: 'cat-106',
    categoryName: '水道光熱費',
    confidence: 0.95,
    isBusiness: true
  },

  // 事業用 - 地代家賃
  {
    keywords: ['賃貸', '家賃', '地代', '月極', '駐車場代', 'オフィス', '事務所', 'テナント'],
    categoryId: 'cat-107',
    categoryName: '地代家賃',
    confidence: 0.9,
    isBusiness: true
  },

  // 個人用 - 食費
  {
    keywords: ['スーパー', 'コンビニ', 'セブン', 'ローソン', 'ファミマ', 'イオン', '西友', 'マクドナルド', 'ケンタッキー', '吉野家', 'すき家', 'なか卯'],
    categoryId: 'cat-301',
    categoryName: '食費',
    confidence: 0.8,
    isBusiness: false
  },

  // 個人用 - 交通費
  {
    keywords: ['定期券', '回数券', '乗車券', '通勤', '通学'],
    categoryId: 'cat-303',
    categoryName: '交通費',
    confidence: 0.8,
    isBusiness: false
  },

  // 個人用 - 娯楽費
  {
    keywords: ['映画', 'カラオケ', 'ゲーム', '遊園地', '水族館', '動物園', 'ライブ', 'コンサート', 'スポーツジム'],
    categoryId: 'cat-304',
    categoryName: '娯楽費',
    confidence: 0.9,
    isBusiness: false
  },

  // 個人用 - 被服費
  {
    keywords: ['ユニクロ', 'GU', 'ZARA', 'H&M', '洋服', '靴', 'バッグ', '服飾'],
    categoryId: 'cat-305',
    categoryName: '被服費',
    confidence: 0.9,
    isBusiness: false
  },

  // 個人用 - 医療費
  {
    keywords: ['病院', '薬局', 'クリニック', '歯科', '医院', '診療所', '処方箋', '薬代'],
    categoryId: 'cat-306',
    categoryName: '医療費',
    confidence: 0.95,
    isBusiness: false
  }
];

export interface ClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  isBusiness: boolean;
  matchedKeywords: string[];
  reasoning: string;
}

/**
 * レシート内容から勘定科目を自動分類する
 */
export function classifyReceipt(
  description: string,
  merchantName?: string,
  ocrText?: string
): ClassificationResult | null {
  const combinedText = `${description || ''} ${merchantName || ''} ${ocrText || ''}`.toLowerCase();
  
  let bestMatch: ClassificationResult | null = null;
  let highestScore = 0;

  for (const rule of CLASSIFICATION_RULES) {
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of rule.keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        score += 1;
      }
    }

    // キーワードマッチ数に基づいてスコアを計算
    const matchRatio = score / rule.keywords.length;
    const finalScore = matchRatio * rule.confidence;

    if (finalScore > highestScore && matchedKeywords.length > 0) {
      highestScore = finalScore;
      bestMatch = {
        categoryId: rule.categoryId,
        categoryName: rule.categoryName,
        confidence: finalScore,
        isBusiness: rule.isBusiness,
        matchedKeywords,
        reasoning: `マッチしたキーワード: ${matchedKeywords.join(', ')}`
      };
    }
  }

  // 最低信頼度のしきい値
  if (bestMatch && bestMatch.confidence < 0.3) {
    return null;
  }

  return bestMatch;
}

/**
 * 金額ベースでの事業/個人判定
 */
export function estimateBusinessPersonal(
  amount: number,
  description: string,
  merchantName?: string
): boolean {
  // 高額な支出は事業費の可能性が高い
  if (amount > 50000) {
    return true;
  }

  // 店舗名・説明で事業関連キーワードをチェック
  const businessKeywords = [
    '株式会社', '有限会社', '合同会社', '事務所', 'オフィス', 
    '会議', '打合せ', '商談', '出張', 'ビジネス'
  ];

  const text = `${description || ''} ${merchantName || ''}`.toLowerCase();
  return businessKeywords.some(keyword => text.includes(keyword.toLowerCase()));
}

/**
 * デフォルト分類を提供
 */
export function getDefaultClassification(isBusiness: boolean): ClassificationResult {
  if (isBusiness) {
    return {
      categoryId: 'cat-115',
      categoryName: '雑費',
      confidence: 0.1,
      isBusiness: true,
      matchedKeywords: [],
      reasoning: '自動分類できませんでした（事業用雑費として分類）'
    };
  } else {
    return {
      categoryId: 'cat-308',
      categoryName: 'その他個人支出',
      confidence: 0.1,
      isBusiness: false,
      matchedKeywords: [],
      reasoning: '自動分類できませんでした（個人用その他として分類）'
    };
  }
}

/**
 * レシート全体の自動分類処理
 */
export function autoClassifyReceipt(
  description: string,
  amount: number,
  merchantName?: string,
  ocrText?: string
): ClassificationResult {
  // まず内容ベースで分類を試行
  const contentClassification = classifyReceipt(description, merchantName, ocrText);
  
  if (contentClassification && contentClassification.confidence > 0.5) {
    return contentClassification;
  }

  // 内容ベース分類が不確実な場合、金額ベースで事業/個人を判定
  const isBusiness = estimateBusinessPersonal(amount, description, merchantName);
  
  if (contentClassification) {
    // 分類はできたが信頼度が低い場合、事業/個人判定を優先
    return {
      ...contentClassification,
      isBusiness,
      reasoning: `${contentClassification.reasoning} (金額ベース判定: ${isBusiness ? '事業用' : '個人用'})`
    };
  }

  // 分類できない場合はデフォルト
  return getDefaultClassification(isBusiness);
}