import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface ClassificationRequest {
  description: string
  amount: number
  merchantName?: string
  ocrText?: string
}

interface ClassificationResult {
  categoryId: string
  categoryName: string
  confidence: number
  isBusiness: boolean
  reasoning: string
  aiModel: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ClassificationRequest = await request.json()
    const { description, amount, merchantName, ocrText } = body

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // サーバーサイドからAPIキーを取得
    const openaiApiKey = process.env.OPENAI_API_KEY
    
    if (!openaiApiKey) {
      // フォールバック: ルールベース分類を使用
      const fallbackResult = performRuleBasedClassification(description, amount, merchantName)
      return NextResponse.json({
        success: true,
        data: fallbackResult
      })
    }

    // OpenAI分類処理
    const openai = new OpenAI({
      apiKey: openaiApiKey
    })

    const analysisText = buildAnalysisText(description, merchantName, ocrText, amount)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: getSystemPrompt()
        },
        {
          role: "user", 
          content: analysisText
        }
      ],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('OpenAI APIからの応答が空です')
    }

    const result = JSON.parse(responseText)
    const classificationResult = validateAndFormatResult(result)

    return NextResponse.json({
      success: true,
      data: classificationResult
    })

  } catch (error) {
    console.error('Classification API Error:', error)
    
    // エラー時はフォールバック分類を返す
    try {
      const body = await request.json()
      const fallbackResult = performRuleBasedClassification(
        body.description, 
        body.amount, 
        body.merchantName
      )
      
      return NextResponse.json({
        success: true,
        data: fallbackResult,
        fallback: true
      })
    } catch (fallbackError) {
      return NextResponse.json({ 
        error: 'Classification failed' 
      }, { status: 500 })
    }
  }
}

function buildAnalysisText(
  description: string,
  merchantName?: string,
  ocrText?: string,
  amount?: number
): string {
  return JSON.stringify({
    description: description || '',
    merchantName: merchantName || '',
    amount: amount || 0,
    ocrText: ocrText?.substring(0, 300) || ''
  })
}

function getSystemPrompt(): string {
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
}`
}

function validateAndFormatResult(result: any): ClassificationResult {
  if (!result.categoryId || !result.categoryName) {
    throw new Error('OpenAI応答に必要なフィールドがありません')
  }

  const confidence = Math.min(Math.max(result.confidence || 0.5, 0), 1)

  return {
    categoryId: result.categoryId,
    categoryName: result.categoryName,
    confidence: confidence,
    isBusiness: result.isBusiness || false,
    reasoning: result.reasoning || 'OpenAI GPT-3.5による分類',
    aiModel: 'OpenAI GPT-3.5 Turbo (Server-side)'
  }
}

function performRuleBasedClassification(
  description: string,
  amount: number,
  merchantName?: string
): ClassificationResult {
  const desc = description.toLowerCase()
  const merchant = merchantName?.toLowerCase() || ''
  
  // ルールベースの簡易分類
  if (desc.includes('コーヒー') || desc.includes('カフェ') || merchant.includes('スタバ')) {
    return {
      categoryId: 'cat-110',
      categoryName: '会議費',
      confidence: 0.7,
      isBusiness: true,
      reasoning: 'ルールベース分類: カフェでの飲み物',
      aiModel: 'Rule-based Fallback'
    }
  }
  
  if (desc.includes('駐車場') || desc.includes('パーキング') || desc.includes('電車')) {
    return {
      categoryId: 'cat-104',
      categoryName: '旅費交通費',
      confidence: 0.8,
      isBusiness: true,
      reasoning: 'ルールベース分類: 交通関連',
      aiModel: 'Rule-based Fallback'
    }
  }
  
  if (amount < 1000) {
    return {
      categoryId: 'cat-108',
      categoryName: '消耗品費',
      confidence: 0.6,
      isBusiness: true,
      reasoning: 'ルールベース分類: 少額消耗品',
      aiModel: 'Rule-based Fallback'
    }
  }
  
  // デフォルト
  return {
    categoryId: 'cat-301',
    categoryName: '食費',
    confidence: 0.5,
    isBusiness: false,
    reasoning: 'ルールベース分類: デフォルト個人支出',
    aiModel: 'Rule-based Fallback'
  }
}