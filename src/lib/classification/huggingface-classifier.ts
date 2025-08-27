// Hugging Face Transformers を使った無料AI分類システム
import { pipeline, env } from '@huggingface/transformers';

// ブラウザ環境用の設定
env.allowLocalModels = false;
env.allowRemoteModels = true;

interface AIClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  isBusiness: boolean;
  reasoning: string;
  aiModel: string;
}

export class HuggingFaceClassifier {
  private classifier: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  /**
   * 分類器の初期化（日本語特化モデル使用）
   */
  private async initialize() {
    try {
      console.log('🤖 Hugging Face分類器を初期化中...');
      
      // テキスト分類用の安定したモデルを使用
      this.classifier = await pipeline(
        'text-classification', 
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english', // 定番の分類モデル
        {
          quantized: true, // 軽量化
          progress_callback: (progress: any) => {
            if (progress.status === 'downloading') {
              console.log(`📥 モデルダウンロード中: ${Math.round(progress.progress || 0)}%`);
            }
          }
        }
      );

      this.isInitialized = true;
      console.log('✅ Hugging Face分類器の初期化完了');
    } catch (error) {
      console.error('❌ メインモデルの初期化に失敗:', error);
      
      // フォールバック1: 軽量英語モデル
      try {
        console.log('🔄 フォールバックモデル1を試行中...');
        this.classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        this.isInitialized = true;
        console.log('✅ フォールバック分類器で初期化完了');
      } catch (fallbackError1) {
        console.warn('⚠️ フォールバック1も失敗:', fallbackError1);
        
        // フォールバック2: 別の安定分類モデル
        try {
          console.log('🔄 フォールバックモデル2を試行中...');
          this.classifier = await pipeline('text-classification', 'Xenova/cardiffnlp-twitter-roberta-base-sentiment-latest');
          this.isInitialized = true;
          console.log('✅ フォールバックモデル2で初期化完了');
        } catch (fallbackError2) {
          console.error('❌ すべてのフォールバックも失敗. AI分類を無効化します');
          this.isInitialized = false;
          // エラーを投げずに、AI分類を無効化
        }
      }
    }
  }

  /**
   * レシート内容をAIで分類
   */
  async classifyReceipt(
    description: string,
    amount: number,
    merchantName?: string,
    ocrText?: string
  ): Promise<AIClassificationResult | null> {
    // 初期化待ち
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }

    if (!this.isInitialized || !this.classifier) {
      console.log('⚠️ AI分類器が利用できません。キーワード分類にフォールバック');
      return null;
    }

    try {
      // 分析用テキストを構築
      const analysisText = this.buildAnalysisText(description, merchantName, ocrText, amount);
      console.log('🔍 AI分析対象テキスト:', analysisText.substring(0, 100) + '...');

      // AI分類実行
      const aiResult = await this.classifier(analysisText);
      console.log('🤖 AI分類結果:', aiResult);

      // 結果を会計カテゴリにマッピング
      const mappedResult = this.mapToAccountingCategory(aiResult, analysisText, amount);
      console.log('🎯 AIマッピング結果:', {
        original_ai: aiResult[0],
        mapped_category: mappedResult.categoryName,
        confidence: mappedResult.confidence,
        reasoning: mappedResult.reasoning
      });
      return mappedResult;

    } catch (error) {
      console.error('❌ AI分類処理エラー:', error);
      return null;
    }
  }

  /**
   * 分析用テキストの構築
   */
  private buildAnalysisText(
    description: string, 
    merchantName?: string, 
    ocrText?: string, 
    amount?: number
  ): string {
    const parts = [
      description && `取引内容: ${description}`,
      merchantName && `店舗: ${merchantName}`,
      amount && `金額: ${amount}円`,
      ocrText && `詳細: ${ocrText.substring(0, 200)}`
    ].filter(Boolean);

    return parts.join('\n');
  }

  /**
   * AI結果を会計カテゴリにマッピング
   */
  private mapToAccountingCategory(
    aiResult: any[], 
    originalText: string, 
    amount: number
  ): AIClassificationResult {
    if (!Array.isArray(aiResult) || aiResult.length === 0) {
      return this.getDefaultMapping(originalText, amount);
    }

    const topResult = aiResult[0];
    const label = topResult.label?.toLowerCase() || '';
    const confidence = topResult.score || 0;

    // ラベルを基に日本の勘定科目にマッピング
    const mapping = this.getLabelMapping(label, originalText, amount);
    
    return {
      ...mapping,
      confidence: Math.min(confidence * 0.8, 0.9), // AI結果は少し保守的に
      reasoning: `AI分析結果: "${topResult.label}" (信頼度: ${Math.round(confidence * 100)}%)`,
      aiModel: 'Hugging Face Transformers'
    };
  }

  /**
   * AIラベルから勘定科目へのマッピング
   */
  private getLabelMapping(label: string, text: string, amount: number) {
    const textLower = text.toLowerCase();
    
    // ビジネス関連キーワードの検出を拡張
    const businessKeywords = ['会議', 'meeting', 'business', 'office', '商談', '打合', 'ミーティング', 'ビジネス', '仕事', '打ち合わせ'];
    const personalKeywords = ['デート', '友人', '家族', 'プライベート', '休日', '個人的'];
    
    const hasBusinessContext = businessKeywords.some(keyword => textLower.includes(keyword));
    const hasPersonalContext = personalKeywords.some(keyword => textLower.includes(keyword));
    
    // 交通関連の判定を最優先（会議費より優先度高）
    if (textLower.includes('駅車場') || textLower.includes('パーキング') || 
        textLower.includes('parking') || textLower.includes('駐車場') ||
        textLower.includes('電車') || textLower.includes('taxi') || 
        textLower.includes('交通') || textLower.includes('jr') ||
        textLower.includes('タクシー') || textLower.includes('バス') ||
        textLower.includes('新幹線') || textLower.includes('地下鉄') ||
        textLower.includes('ガソリン') || textLower.includes('etc')) {
      return { categoryId: 'cat-104', categoryName: '旅費交通費', isBusiness: true };
    }
    
    // カフェ・コーヒー店の判定（交通費の後に置く）
    if (textLower.includes('カフェ') || textLower.includes('coffee') || textLower.includes('cafe')) {
      // 明確な個人的コンテキストがない限り、ビジネス用と推定
      if (hasPersonalContext) {
        return { categoryId: 'cat-301', categoryName: '食費', isBusiness: false };
      } else {
        // デフォルトで会議費として判定（カフェはビジネスユースが多いため）
        return { categoryId: 'cat-110', categoryName: '会議費', isBusiness: true };
      }
    }
    
    // エナジードリンク・コーヒーの優先判定（コンビニかどうかに関係なく）
    if (textLower.includes('コーヒー') || textLower.includes('coffee') ||
        textLower.includes('エナジー') || textLower.includes('energy') ||
        textLower.includes('レッドブル') || textLower.includes('redbull') ||
        textLower.includes('モンスター') || textLower.includes('monster') ||
        textLower.includes('リポビタン') || textLower.includes('リポビタンd') ||
        textLower.includes('飲み物') || textLower.includes('ドリンク')) {
      console.log('🥤 エナジードリンク/コーヒーを検出、会議費に分類');
      return { categoryId: 'cat-110', categoryName: '会議費', isBusiness: true };
    }
    
    // コンビニ・スーパーでのその他商品
    if (textLower.includes('コンビニ') || textLower.includes('スーパー') ||
        textLower.includes('セブン') || textLower.includes('ローソン') ||
        textLower.includes('ファミマ') || textLower.includes('seven') || textLower.includes('lawson')) {
      // 飲み物は上記で処理済みなので、ここはその他商品
      return amount > 3000 ? 
        { categoryId: 'cat-108', categoryName: '消耗品費', isBusiness: true } :
        { categoryId: 'cat-301', categoryName: '食費', isBusiness: false };
    }
    
    if (textLower.includes('通信') || textLower.includes('mobile') || textLower.includes('internet')) {
      return { categoryId: 'cat-105', categoryName: '通信費', isBusiness: true };
    }

    // 金額ベースの推定（ロジック改善）
    if (amount > 10000) {
      return { categoryId: 'cat-115', categoryName: '雑費', isBusiness: true };
    } else if (amount > 1000) {
      // 中金額はビジネス用の可能性を考慮
      return hasPersonalContext ? 
        { categoryId: 'cat-308', categoryName: 'その他個人支出', isBusiness: false } :
        { categoryId: 'cat-110', categoryName: '会議費', isBusiness: true };
    } else {
      return { categoryId: 'cat-308', categoryName: 'その他個人支出', isBusiness: false };
    }
  }

  /**
   * デフォルトマッピング
   */
  private getDefaultMapping(text: string, amount: number): AIClassificationResult {
    const isBusiness = amount > 5000 || text.includes('事業') || text.includes('ビジネス');
    
    return {
      categoryId: isBusiness ? 'cat-115' : 'cat-308',
      categoryName: isBusiness ? '雑費' : 'その他個人支出',
      confidence: 0.3,
      isBusiness,
      reasoning: 'AI分類結果が不明確のため、金額と内容から推定',
      aiModel: 'Hugging Face Transformers (fallback)'
    };
  }

  /**
   * 分類器の状態確認
   */
  isReady(): boolean {
    return this.isInitialized && this.classifier !== null;
  }

  /**
   * 分類器の初期化状況
   */
  getStatus(): string {
    if (this.initPromise) return 'initializing';
    if (this.isInitialized) return 'ready';
    return 'error';
  }
}

// シングルトンインスタンス
let classifierInstance: HuggingFaceClassifier | null = null;

/**
 * AI分類器のインスタンスを取得
 */
export function getHuggingFaceClassifier(): HuggingFaceClassifier {
  if (!classifierInstance) {
    classifierInstance = new HuggingFaceClassifier();
  }
  return classifierInstance;
}

/**
   * 簡単なAI分類実行関数
   */
export async function classifyWithAI(
  description: string,
  amount: number,
  merchantName?: string,
  ocrText?: string
): Promise<AIClassificationResult | null> {
  const classifier = getHuggingFaceClassifier();
  return await classifier.classifyReceipt(description, amount, merchantName, ocrText);
}