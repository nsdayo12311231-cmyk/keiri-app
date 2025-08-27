// OpenAI GPT-3.5を使った高精度レシート分類システム
import OpenAI from 'openai';

interface OpenAIClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  isBusiness: boolean;
  reasoning: string;
  aiModel: string;
}

export class OpenAIClassifier {
  private openai: OpenAI | null = null;
  private isInitialized = false;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // クライアントサイド実行用
      });
      this.isInitialized = true;
    }
  }

  /**
   * OpenAI APIキーの設定
   */
  setApiKey(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    this.isInitialized = true;
    console.log('✅ OpenAI APIキーが設定されました');
  }

  /**
   * OpenAI GPT-3.5でレシート分類
   */
  async classifyReceipt(
    description: string,
    amount: number,
    merchantName?: string,
    ocrText?: string
  ): Promise<OpenAIClassificationResult | null> {
    if (!this.isInitialized || !this.openai) {
      console.log('⚠️ OpenAI APIキーが設定されていません');
      return null;
    }

    try {
      const analysisText = this.buildAnalysisText(description, merchantName, ocrText, amount);
      console.log('🤖 OpenAI分析開始:', analysisText.substring(0, 150) + '...');

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: analysisText
          }
        ],
        max_tokens: 200,
        temperature: 0.1, // 一貫した結果のため低く設定
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('OpenAI APIからの応答が空です');
      }

      console.log('🎯 OpenAI応答:', responseText);
      
      const result = JSON.parse(responseText);
      return this.validateAndFormatResult(result, analysisText);

    } catch (error: any) {
      console.error('❌ OpenAI分類エラー:', error);
      
      // エラーの詳細情報をログ出力
      if (error?.response?.data) {
        console.error('OpenAI APIレスポンスエラー:', error.response.data);
      }
      if (error?.message) {
        console.error('OpenAIエラーメッセージ:', error.message);
      }
      
      return null;
    }
  }

  /**
   * 分析用テキスト構築
   */
  private buildAnalysisText(
    description: string,
    merchantName?: string,
    ocrText?: string,
    amount?: number
  ): string {
    return JSON.stringify({
      description: description || '',
      merchantName: merchantName || '',
      amount: amount || 0,
      ocrText: ocrText?.substring(0, 300) || '' // OCRテキストは長いので制限
    });
  }

  /**
   * システムプロンプト（日本の勘定科目分類専用）
   */
  private getSystemPrompt(): string {
    return `あなたは日本の会計における勘定科目分類の専門家です。
レシート情報を分析して、適切な勘定科目に分類してください。

利用可能な勘定科目：
【事業用】
- cat-103: 広告宣伝費
- cat-104: 旅費交通費 (電車、タクシー、駐車場、ガソリン等)
- cat-105: 通信費 (携帯電話、インターネット等)
- cat-106: 水道光熱費 (電気代、ガス代等)
- cat-107: 地代家賃 (オフィス賃料等)
- cat-108: 消耗品費 (事務用品、小額備品等)
- cat-110: 会議費 (カフェ、会議室等での飲食)
- cat-111: 接待交際費 (取引先との飲食等)
- cat-115: 雑費 (その他事業費用)

【個人用】
- cat-301: 食費 (日常の食材、外食等)
- cat-303: 交通費 (通勤定期券等)
- cat-304: 娯楽費 (映画、ゲーム等)
- cat-305: 被服費 (衣類、靴等)
- cat-306: 医療費 (病院、薬局等)
- cat-308: その他個人支出

分析ポイント:
1. 店舗名・商品から用途を推定
2. 金額の妥当性を考慮
3. ビジネス用途 vs 個人用途を判定
4. 特別ルール:
   - カフェでの飲み物 → 会議費
   - 駐車場・パーキング → 旅費交通費
   - コンビニのコーヒー・エナジードリンク → 会議費（業務用飲み物）

回答はJSON形式で以下の形式:
{
  "categoryId": "cat-XXX",
  "categoryName": "カテゴリ名",
  "confidence": 0.XX,
  "isBusiness": true/false,
  "reasoning": "判定理由"
}`;
  }

  /**
   * 結果の検証とフォーマット
   */
  private validateAndFormatResult(result: any, originalText: string): OpenAIClassificationResult {
    // 基本的な検証
    if (!result.categoryId || !result.categoryName) {
      throw new Error('OpenAI応答に必要なフィールドがありません');
    }

    // 信頼度の正規化
    const confidence = Math.min(Math.max(result.confidence || 0.5, 0), 1);

    return {
      categoryId: result.categoryId,
      categoryName: result.categoryName,
      confidence: confidence,
      isBusiness: result.isBusiness || false,
      reasoning: result.reasoning || 'OpenAI GPT-3.5による分類',
      aiModel: 'OpenAI GPT-3.5 Turbo'
    };
  }

  /**
   * 初期化状態の確認
   */
  isReady(): boolean {
    return this.isInitialized && this.openai !== null;
  }

  /**
   * 利用状況の取得
   */
  getStatus(): string {
    if (this.isReady()) return 'ready';
    return 'need_api_key';
  }
}

// グローバルインスタンス
let openaiClassifierInstance: OpenAIClassifier | null = null;

/**
 * OpenAI分類器のインスタンス取得
 */
export function getOpenAIClassifier(): OpenAIClassifier {
  if (!openaiClassifierInstance) {
    // 環境変数からAPIキーを取得
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    openaiClassifierInstance = new OpenAIClassifier(apiKey);
  }
  return openaiClassifierInstance;
}

/**
 * 簡単なOpenAI分類実行関数
 */
export async function classifyWithOpenAI(
  description: string,
  amount: number,
  merchantName?: string,
  ocrText?: string
): Promise<OpenAIClassificationResult | null> {
  const classifier = getOpenAIClassifier();
  return await classifier.classifyReceipt(description, amount, merchantName, ocrText);
}

/**
 * APIキーの動的設定
 */
export function setOpenAIApiKey(apiKey: string) {
  const classifier = getOpenAIClassifier();
  classifier.setApiKey(apiKey);
}