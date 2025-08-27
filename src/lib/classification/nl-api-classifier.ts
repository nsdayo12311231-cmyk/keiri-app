import { LanguageServiceClient } from '@google-cloud/language';

interface NLClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  isBusiness: boolean;
  reasoning: string;
  entities: Array<{name: string, type: string, salience: number}>;
}

export class NaturalLanguageClassifier {
  private client: LanguageServiceClient;
  
  constructor(keyFile?: string) {
    this.client = new LanguageServiceClient({
      keyFilename: keyFile
    });
  }

  async classifyReceipt(
    description: string,
    merchantName?: string,
    ocrText?: string
  ): Promise<NLClassificationResult | null> {
    const text = `${description || ''} ${merchantName || ''} ${ocrText || ''}`;
    
    try {
      // 並列実行で高速化
      const [entitiesResult, categoryResult, sentimentResult] = await Promise.all([
        this.analyzeEntities(text),
        this.classifyText(text),
        this.analyzeSentiment(text)
      ]);

      return this.determineCategory(entitiesResult, categoryResult, sentimentResult);
    } catch (error) {
      console.error('Natural Language API error:', error);
      return null;
    }
  }

  private async analyzeEntities(text: string) {
    const [result] = await this.client.analyzeEntities({
      document: { content: text, type: 'PLAIN_TEXT' }
    });
    return result.entities || [];
  }

  private async classifyText(text: string) {
    const [result] = await this.client.classifyText({
      document: { content: text, type: 'PLAIN_TEXT' }
    });
    return result.categories || [];
  }

  private async analyzeSentiment(text: string) {
    const [result] = await this.client.analyzeSentiment({
      document: { content: text, type: 'PLAIN_TEXT' }
    });
    return result.documentSentiment;
  }

  private determineCategory(entities: any[], categories: any[], sentiment: any): NLClassificationResult {
    // エンティティベースの判定
    const businessKeywords = ['会議', 'ミーティング', '商談', '打合せ', 'オフィス', '事務所'];
    const personalKeywords = ['デート', '友人', '家族', 'プライベート'];
    
    const hasBusinessContext = entities.some(entity => 
      businessKeywords.some(keyword => entity.name.includes(keyword))
    ) || businessKeywords.some(keyword => 
      entities.some(entity => entity.name.includes(keyword))
    );

    // カテゴリマッピング
    const categoryMappings = {
      '/Food & Drink/Coffee & Tea': hasBusinessContext ? 
        { id: 'cat-110', name: '会議費', isBusiness: true } :
        { id: 'cat-301', name: '食費', isBusiness: false },
      '/Travel/Transportation': { id: 'cat-104', name: '旅費交通費', isBusiness: true },
      '/Computers & Electronics': { id: 'cat-108', name: '消耗品費', isBusiness: true },
      '/Business & Industrial': { id: 'cat-115', name: '雑費', isBusiness: true }
    };

    // 最も信頼度の高いカテゴリを選択
    const bestCategory = categories.reduce((best, cat) => 
      cat.confidence > (best?.confidence || 0) ? cat : best, null
    );

    if (bestCategory && categoryMappings[bestCategory.name]) {
      const mapping = categoryMappings[bestCategory.name];
      return {
        categoryId: mapping.id,
        categoryName: mapping.name,
        confidence: bestCategory.confidence,
        isBusiness: mapping.isBusiness,
        reasoning: `自然言語解析により「${bestCategory.name}」として分類。検出されたエンティティ: ${entities.map(e => e.name).join(', ')}`,
        entities: entities.map(e => ({ name: e.name, type: e.type, salience: e.salience }))
      };
    }

    // デフォルト分類
    return {
      categoryId: hasBusinessContext ? 'cat-115' : 'cat-308',
      categoryName: hasBusinessContext ? '雑費' : 'その他個人支出',
      confidence: 0.5,
      isBusiness: hasBusinessContext,
      reasoning: `文脈分析により${hasBusinessContext ? '事業用' : '個人用'}として判定`,
      entities: entities.map(e => ({ name: e.name, type: e.type, salience: e.salience }))
    };
  }
}

// ハイブリッド分類器（既存ルール + NL API）
export class HybridClassifier {
  private nlClassifier: NaturalLanguageClassifier;

  constructor(keyFile?: string) {
    this.nlClassifier = new NaturalLanguageClassifier(keyFile);
  }

  async classifyReceipt(
    description: string,
    amount: number,
    merchantName?: string,
    ocrText?: string
  ): Promise<NLClassificationResult> {
    // まずキーワードベース分類を試行
    const keywordResult = this.keywordClassify(description, merchantName, ocrText);
    
    // 高信頼度なら採用
    if (keywordResult && keywordResult.confidence > 0.8) {
      return keywordResult;
    }

    // 低信頼度または分類不可の場合、NL APIを使用
    const nlResult = await this.nlClassifier.classifyReceipt(description, merchantName, ocrText);
    
    if (nlResult && nlResult.confidence > 0.6) {
      return nlResult;
    }

    // 両方とも低信頼度の場合、組み合わせて判定
    return this.combineResults(keywordResult, nlResult, amount);
  }

  private keywordClassify(description: string, merchantName?: string, ocrText?: string) {
    // 既存のキーワードベース分類ロジック
    // （現在のclassifyReceiptメソッドを移植）
  }

  private combineResults(keywordResult: any, nlResult: any, amount: number) {
    // 複数の結果を組み合わせて最適な分類を決定
  }
}