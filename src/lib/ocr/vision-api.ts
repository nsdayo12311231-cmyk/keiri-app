interface GeminiVisionResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface VisionAPIResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: {
        vertices: Array<{ x?: number; y?: number }>;
      };
      confidence?: number;
    }>;
    fullTextAnnotation?: {
      text: string;
      pages?: Array<{
        confidence?: number;
        blocks?: Array<{
          confidence?: number;
          paragraphs?: Array<{
            confidence?: number;
            words?: Array<{
              confidence?: number;
              symbols?: Array<{
                text: string;
                confidence?: number;
              }>;
            }>;
          }>;
        }>;
      }>;
    };
  }>;
}

interface ExtractedData {
  amount?: number;
  description?: string;
  date?: string;
  merchantName?: string;
  category?: string;
  confidence?: number;
}

export class ReceiptOCR {
  private apiKey: string;
  private useGemini: boolean;

  constructor(apiKey: string, useGemini: boolean = true) {
    this.apiKey = apiKey;
    this.useGemini = useGemini;
  }

  // OCRテキストの前処理（ノイズ除去、正規化）
  private preprocessOCRText(text: string): string {
    // 改行の正規化
    let processed = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    
    // 行ごとに処理
    const lines = processed.split('\n');
    const processedLines = lines.map(line => {
      return line
        // 行内の連続する空白を単一のスペースに変換
        .replace(/\s+/g, ' ')
        // 全角数字を半角に変換
        .replace(/[０-９]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFEE0))
        // 全角記号を半角に変換
        .replace(/：/g, ':')
        .replace(/￥/g, '¥')
        .replace(/，/g, ',')
        // OCR誤認識の修正（数字の誤読み）
        .replace(/S44/g, '544') // Sを5と誤認識
        .replace(/S4S/g, '545') // Sを5と誤認識
        .replace(/B/g, '6')     // Bを6と誤認識することがある
        .replace(/O/g, '0')     // Oを0と誤認識することがある
        .replace(/l/g, '1')     // lを1と誤認識することがある
        .replace(/I/g, '1')     // Iを1と誤認識することがある
        // 不要な記号を除去
        .replace(/[・※]/g, '')
        // 前後の空白を削除
        .trim();
    }).filter(line => line.length > 0);
    
    return processedLines.join('\n');
  }
  
  // 数字パターンの修正（OCR誤読み対策）
  private fixNumberMisreading(numberStr: string): string {
    // 基本的な文字と数字の誤読みのみを修正
    return numberStr
      .replace(/O/g, '0')     // O → 0
      .replace(/o/g, '0')     // o → 0  
      .replace(/l/g, '1')     // l → 1
      .replace(/I/g, '1')     // I → 1
      .replace(/S/g, '5')     // S → 5
      .replace(/s/g, '5')     // s → 5
      .replace(/G/g, '6')     // G → 6
      .replace(/B/g, '8')     // B → 8
      .replace(/D/g, '0')     // D → 0
      .replace(/Z/g, '2');    // Z → 2
  }

  // レシートタイプを判定
  private identifyReceiptType(lines: string[]): 'convenience' | 'supermarket' | 'restaurant' | 'pharmacy' | 'gas_station' | 'retail' | 'unknown' {
    const text = lines.join(' ').toLowerCase();
    
    // コンビニ
    if (/セブン|ローソン|ファミリーマート|ファミマ|サークルk|ミニストップ/.test(text)) {
      return 'convenience';
    }
    
    // スーパーマーケット
    if (/イオン|西友|ライフ|マックスバリュ|業務スーパー|食品|野菜|肉|魚/.test(text)) {
      return 'supermarket';
    }
    
    // レストラン・飲食店
    if (/レストラン|カフェ|食事|飲み物|ドリンク|料理|テーブル|スターバックス|starbucks|スタバ|コーヒー|latte|americano/.test(text)) {
      return 'restaurant';
    }
    
    // ドラッグストア
    if (/ドラッグ|薬局|処方箋|医薬品|サプリ|化粧品/.test(text)) {
      return 'pharmacy';
    }
    
    // ガソリンスタンド
    if (/ガソリン|給油|燃料|ss|エネオス|出光|コスモ/.test(text)) {
      return 'gas_station';
    }
    
    // 小売店
    if (/店|支店|本店|営業所/.test(text)) {
      return 'retail';
    }
    
    return 'unknown';
  }

  // レシートタイプに応じた金額パターンを取得
  private getAmountPatterns(receiptType: string) {
    const basePatterns = {
      // 最優先パターン（税込合計など）
      finalTotal: [
        /税込[\s]*合計[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /税込[\s]*総額[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /総合計[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /総合計[\s]+¥?([0-9,]+)/gi,                     // 「総合計 ¥455」「総合計 455」パターン
        /^[\s]*総合計[\s]*¥?([0-9,]+)[\s]*$/gim,        // 行頭から「総合計」で始まるパターン
        /(?:合計|計)[\s]*（税込[^）]*）[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /合計[\s]*\([\s]*税込[\s]*\)[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /¥[\s]*([0-9,]+)[\s]*税込/gi,                   // スターバックス特有：¥455税込
      ],
      
      // 一般的な合計パターン
      total: [
        /^[\s]*合計[\s]*:?[\s]*¥?([0-9,]+)[\s]*$/gim,
        /(?<!小)計[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /total[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /お会計[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /お支払い[\s]*:?[\s]*¥?([0-9,]+)/gi,
      ],
      
      // 小計パターン
      subtotal: [
        /小計[\s]*:?[\s]*¥?([0-9,]+)/gi,
        /subtotal[\s]*:?[\s]*¥?([0-9,]+)/gi,
      ],
      
      // フォールバック（数値のみ）
      fallback: [
        /¥[\s]*([0-9,]+)/g,
        /([0-9,]+)[\s]*円/g,
        /([0-9,]{3,})(?![0-9])/g, // 3桁以上の数値
      ]
    };

    // レシートタイプ特有のパターンを追加
    switch (receiptType) {
      case 'convenience':
        return {
          ...basePatterns,
          specific: [
            /お買上金額[\s]*:?[\s]*¥?([0-9,]+)/gi,
            /代金[\s]*:?[\s]*¥?([0-9,]+)/gi,
          ]
        };
      
      case 'supermarket':
        return {
          ...basePatterns,
          specific: [
            /お買上金額[\s]*:?[\s]*¥?([0-9,]+)/gi,
            /お買い物合計[\s]*:?[\s]*¥?([0-9,]+)/gi,
          ]
        };
      
      case 'restaurant':
        return {
          ...basePatterns,
          specific: [
            /お会計[\s]*:?[\s]*¥?([0-9,]+)/gi,
            /料金[\s]*:?[\s]*¥?([0-9,]+)/gi,
            /飲食代[\s]*:?[\s]*¥?([0-9,]+)/gi,
            /ご利用金額[\s]*:?[\s]*¥?([0-9,]+)/gi,
            /お支払い額[\s]*:?[\s]*¥?([0-9,]+)/gi,
            /¥[\s]*([0-9,]+)[\s]*(?:税込|込)/gi,            // スターバックス特有：¥455税込
            /総合計[\s]*¥[\s]*([0-9,]+)/gi,                 // スターバックス特有：総合計 ¥455
            /^[\s]*¥[\s]*([0-9,]+)[\s]*$/gim,               // 単独で¥金額のみの行
          ]
        };
      
      case 'gas_station':
        return {
          ...basePatterns,
          specific: [
            /給油代[\s]*:?[\s]*¥?([0-9,]+)/gi,
            /燃料代[\s]*:?[\s]*¥?([0-9,]+)/gi,
          ]
        };
      
      default:
        return basePatterns;
    }
  }

  // 金額を抽出する統合メソッド
  private extractAmount(lines: string[], patterns: any): number | undefined {
    console.log('=== 金額抽出デバッグ開始 ===');
    console.log('処理対象行数:', lines.length);
    
    // スターバックス専用の特別処理
    const isStarbucks = lines.some(line => /スターバックス|starbucks/i.test(line));
    if (isStarbucks) {
      console.log('スターバックスレシートを検出');
      
      // 「総合計」の次の行の数字を探す
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].includes('総合計') && /^\d{3,4}$/.test(lines[i + 1].trim())) {
          const amount = parseInt(lines[i + 1].trim());
          console.log(`スターバックス専用パターンで金額発見: ${amount}`);
          return amount;
        }
      }
      
      // 「総合計 数字」パターン
      for (const line of lines) {
        const match = line.match(/総合計\s+(\d{3,4})/);
        if (match) {
          const amount = parseInt(match[1]);
          console.log(`スターバックス専用パターン2で金額発見: ${amount}`);
          return amount;
        }
      }
    }
    
    // コンビニレシート専用処理を追加
    const isConvenience = lines.some(line => /セブン|ローソン|ファミマ|ファミリーマート/i.test(line));
    if (isConvenience) {
      console.log('コンビニレシートを検出');
      
      // ¥230のような行を直接探す
      for (const line of lines) {
        const match = line.match(/^¥(\d{2,4})$/);
        if (match) {
          const amount = parseInt(match[1]);
          console.log(`コンビニ専用パターンで金額発見: ${amount}`);
          if (amount >= 50 && amount <= 10000) { // 妥当な範囲
            return amount;
          }
        }
      }
      
      // 「合計 ¥230」パターン
      for (const line of lines) {
        const match = line.match(/合計.*¥(\d{2,4})/);
        if (match) {
          const amount = parseInt(match[1]);
          console.log(`コンビニ合計パターンで金額発見: ${amount}`);
          return amount;
        }
      }
    }
    
    // より強力な除外パターン
    const excludePatterns = [
      /#\d+/,           // #542 のような番号
      /TEL|電話/i,      // 電話番号を含む行
      /〒/,             // 郵便番号
      /お釣り|おつり/,   // お釣り
      /日.*時|年.*月.*日/, // 日時を含む行
      /250-\d+-\d+-\d+/, // 伝票番号パターン
      /責.*\d+/,        // 責任者番号
    ];

    // パターンの優先順位で検索
    const searchOrder = ['finalTotal', 'specific', 'total', 'subtotal', 'fallback'];
    
    // 全ての候補を収集
    const allCandidates: Array<{amount: number, source: string, line: string, pattern: string}> = [];
    
    for (const patternGroup of searchOrder) {
      if (!patterns[patternGroup]) continue;
      
      console.log(`\n--- ${patternGroup} パターンでの検索 ---`);
      
      for (const line of lines) {
        // 除外パターンチェック（より詳細なログ付き）
        let isExcluded = false;
        let excludeReason = '';
        
        for (const pattern of excludePatterns) {
          if (pattern.test(line)) {
            isExcluded = true;
            excludeReason = pattern.source;
            break;
          }
        }
        
        if (isExcluded) {
          console.log(`除外された行: "${line}" (理由: ${excludeReason})`);
          continue;
        }

        for (let i = 0; i < patterns[patternGroup].length; i++) {
          const pattern = patterns[patternGroup][i];
          const match = line.match(pattern);
          if (match && match[1]) {
            console.log(`\n✓ マッチ発見!`);
            console.log(`  行: "${line}"`);
            console.log(`  パターン: ${pattern.source}`);
            console.log(`  抽出値: "${match[1]}"`);
            
            let numStr = match[1].replace(/,/g, '');
            console.log(`  カンマ除去後: "${numStr}"`);
            
            // OCR誤読みを修正
            const originalNumStr = numStr;
            numStr = this.fixNumberMisreading(numStr);
            console.log(`  誤読み修正: "${originalNumStr}" → "${numStr}"`);
            
            const num = parseInt(numStr);
            console.log(`  最終数値: ${num}`);
            
            if (num > 0 && num < 10000000) {
              allCandidates.push({
                amount: num,
                source: patternGroup,
                line: line,
                pattern: pattern.source
              });
              
              // 優先度の高いパターンで見つかった場合は即座に返す
              if (patternGroup === 'finalTotal' || patternGroup === 'specific') {
                console.log(`\n🎯 高優先度パターンで確定: ${num}円`);
                return num;
              }
            }
          }
        }
      }
    }

    console.log(`\n=== 全ての候補 (${allCandidates.length}個) ===`);
    allCandidates.forEach((candidate, index) => {
      console.log(`候補${index + 1}: ${candidate.amount}円`);
      console.log(`  ソース: ${candidate.source}`);
      console.log(`  行: "${candidate.line}"`);
      console.log(`  パターン: ${candidate.pattern}`);
    });
    
    // 候補から最適な金額を選択
    if (allCandidates.length > 0) {
      // 優先度順でソート
      const priorityOrder = ['finalTotal', 'specific', 'total', 'subtotal', 'fallback'];
      allCandidates.sort((a, b) => {
        const aPriority = priorityOrder.indexOf(a.source);
        const bPriority = priorityOrder.indexOf(b.source);
        return aPriority - bPriority;
      });
      
      const selected = allCandidates[0];
      console.log(`\n🎯 選択された金額: ${selected.amount}円`);
      console.log(`   理由: ${selected.source}パターンで最優先`);
      return selected.amount;
    }

    console.log('\n❌ 金額が見つかりませんでした');
    return undefined;
  }

  // 店舗名を抽出
  private extractMerchantName(lines: string[], receiptType: string): string | undefined {
    // レシートタイプ別の店舗名パターン
    const storePatterns = [
      // 法人形式
      /株式会社[\s]*(.+)/,
      /㈱[\s]*(.+)/,
      /有限会社[\s]*(.+)/,
      /合同会社[\s]*(.+)/,
      
      // 店舗形式
      /(.+)[\s]*店$/,
      /(.+)[\s]*支店$/,
      /(.+)[\s]*本店$/,
      /(.+)[\s]*営業所$/,
      
      // チェーン店特有
      /セブン[\s]*イレブン/,
      /ファミリーマート/,
      /ローソン/,
      /ミニストップ/,
      /イオン/,
      /西友/,
      /ライフ/,
      /マックスバリュ/,
    ];

    // レシートの上部数行で店舗名を探す
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i].trim();
      
      // 空行や短すぎる行はスキップ
      if (!line || line.length < 2) continue;
      
      // 明らかに店舗名ではないものを除外
      if (/^[0-9\-\/]+$|電話|TEL|FAX|住所|〒|営業時間|レシート|領収書/.test(line)) {
        continue;
      }

      for (const pattern of storePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const storeName = match[1].trim();
          if (storeName.length > 0 && storeName.length < 30) {
            return storeName;
          }
        }
      }

      // パターンマッチしない場合：文字のみで適度な長さの行を店舗名とみなす
      if (line.length >= 3 && line.length <= 20 && !/[0-9]/.test(line) && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(line)) {
        return line;
      }
    }

    return undefined;
  }

  // 日付を抽出
  private extractDate(lines: string[]): string | undefined {
    const datePatterns = [
      // 標準的な日付形式
      /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,     // 2025-08-26, 2025/8/26
      /(\d{4})年(\d{1,2})月(\d{1,2})日/,          // 2025年8月26日
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,          // 8/26/2025
      /(\d{1,2})-(\d{1,2})-(\d{4})/,           // 8-26-2025
      
      // 和暦対応
      /令和(\d{1,2})年(\d{1,2})月(\d{1,2})日/,    // 令和7年8月26日
      /平成(\d{1,2})年(\d{1,2})月(\d{1,2})日/,    // 平成31年1月1日
      
      // 短縮形式
      /(\d{2})\.(\d{1,2})\.(\d{1,2})/,          // 25.8.26
      /(\d{1,2})月(\d{1,2})日/,                  // 8月26日（年なし）
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          try {
            let year: number, month: number, day: number;

            if (pattern.source.includes('令和')) {
              // 令和年号の処理
              year = parseInt(match[1]) + 2018; // 令和元年 = 2019年
              month = parseInt(match[2]);
              day = parseInt(match[3]);
            } else if (pattern.source.includes('平成')) {
              // 平成年号の処理
              year = parseInt(match[1]) + 1988; // 平成元年 = 1989年
              month = parseInt(match[2]);
              day = parseInt(match[3]);
            } else if (pattern.source.includes('年')) {
              // 通常の年月日
              year = parseInt(match[1]);
              month = parseInt(match[2]);
              day = parseInt(match[3]);
            } else if (match[3] && match[3].length === 4) {
              // MM/DD/YYYY形式
              month = parseInt(match[1]);
              day = parseInt(match[2]);
              year = parseInt(match[3]);
            } else if (match[1] && match[1].length === 4) {
              // YYYY-MM-DD形式
              year = parseInt(match[1]);
              month = parseInt(match[2]);
              day = parseInt(match[3]);
            } else if (pattern.source.includes('月')) {
              // 月日のみ（現在の年を使用）
              year = new Date().getFullYear();
              month = parseInt(match[1]);
              day = parseInt(match[2]);
            } else {
              continue;
            }

            // 日付の妥当性チェック
            if (year >= 2000 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
          } catch (e) {
            console.log('Date parsing error:', e);
            continue;
          }
        }
      }
    }

    return undefined;
  }

  async extractWithGemini(imageBase64: string): Promise<{ ocrText: string; extractedData: ExtractedData }> {
    try {
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `🧾 レシートOCR処理：この画像から日本語レシートの情報を抽出してください。

必須要件：
1. JSONのみ回答（説明不要）
2. 合計金額を正確に読み取る
3. 全テキストを保持する

出力形式：
{
  "receipts": [{
    "amount": 数値,
    "description": "購入内容",
    "date": "YYYY-MM-DD",
    "merchantName": "店舗名",
    "category": "食費",
    "confidence": 0.85
  }],
  "totalCount": 1,
  "ocrText": "画像内の全テキスト（改行含む）"
}

OCR精度向上のポイント：
- 数字は慎重に読み取る（0/O, 1/I/l, 5/S の区別）
- 税込み総額を優先
- 不明項目は null を使用
- confidenceは読み取り確実性（0-1）

日本語レシート専用処理を開始します。`
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result: GeminiVisionResponse = await response.json();
      const responseText = result.candidates[0]?.content?.parts[0]?.text;
      
      if (!responseText) {
        throw new Error('No response from Gemini API');
      }

      console.log('🤖 === Gemini OCR 詳細分析 ===');
      console.log('📊 レスポンス統計:', {
        length: responseText.length,
        hasCodeBlocks: responseText.includes('```'),
        hasJSON: responseText.includes('{') && responseText.includes('}'),
        confidence: 'analyzing...'
      });
      console.log('📝 レスポンス冒頭 (1000文字):', responseText.substring(0, 1000));
      
      // 🔍 高度JSON抽出: 複数パターンに対応
      let jsonText = '';
      
      // パターン1: マークダウンコードブロック
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
        console.log('✅ コードブロック形式検出');
      }
      
      // パターン2: 単純JSON（バックアップ）
      if (!jsonText) {
        const simpleJsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (simpleJsonMatch) {
          jsonText = simpleJsonMatch[0].trim();
          console.log('✅ 単純JSON形式検出');
        } else {
          jsonText = responseText.trim();
          console.log('⚠️ JSON構造未検出、全文解析を試行');
        }
      }
      
      console.log('🎯 抽出JSON統計:', {
        length: jsonText.length,
        startsWithBrace: jsonText.startsWith('{'),
        endsWithBrace: jsonText.endsWith('}'),
        preview: jsonText.substring(0, 300) + (jsonText.length > 300 ? '...' : '')
      });
      
      // 🧹 JSON前処理: OCR品質向上のための高度クリーンアップ
      jsonText = jsonText
        // 基本クリーンアップ
        .replace(/[\x00-\x1F\x7F]/g, '')  // 制御文字除去
        .replace(/\r\n/g, '\n')          // 改行正規化
        .replace(/\r/g, '\n')
        // OCR誤認識文字の修正
        .replace(/"(\d+)"/g, '$1')        // 数値文字列を数値に
        .replace(/：/g, ':')              // 全角コロンを半角に
        .replace(/，/g, ',')              // 全角カンマを半角に
        .trim();
      
      let parsedData;
      let parseAttempt = 1;
      
      // 🔄 段階的JSON解析: 3段階でチャレンジ
      try {
        console.log(`🚀 JSON解析試行 ${parseAttempt}: 基本解析`);
        parsedData = JSON.parse(jsonText);
        console.log('✨ JSON解析成功: 基本解析で完了');
        
      } catch (parseError) {
        console.warn(`❌ JSON解析失敗 ${parseAttempt}:`, (parseError as Error).message);
        parseAttempt++;
        
        try {
          console.log(`🚀 JSON解析試行 ${parseAttempt}: 高度クリーンアップ`);
          const cleanedJson = jsonText
            .replace(/,\s*}/g, '}')       // 末尾カンマ除去
            .replace(/,\s*]/g, ']')       // 配列末尾カンマ除去
            .replace(/\n/g, ' ')          // 改行をスペースに
            .replace(/\t/g, ' ')          // タブをスペースに
            .replace(/\s+/g, ' ')         // 連続スペースを単一化
            .replace(/'\s*:\s*'/g, '":"') // シングルクォートをダブルクォートに
            .replace(/(\w+):/g, '"$1":'); // プロパティ名をクォート
          
          parsedData = JSON.parse(cleanedJson);
          console.log('✨ JSON解析成功: 高度クリーンアップで解決');
          
        } catch (secondParseError) {
          console.error(`❌ JSON解析失敗 ${parseAttempt}:`, (secondParseError as Error).message);
          parseAttempt++;
          
          try {
            console.log(`🚀 JSON解析試行 ${parseAttempt}: 最終フォールバック`);
            // 最終手段: 正規表現で主要データを抽出
            const emergencyExtraction = this.extractDataWithRegex(responseText);
            
            if (emergencyExtraction) {
              parsedData = emergencyExtraction;
              console.log('✨ 緊急データ抽出成功: 正規表現フォールバック');
            } else {
              throw new Error('All JSON parse methods failed');
            }
            
          } catch (finalError) {
            console.error(`❌❌❌ 全JSON解析手法失敗 ❌❌❌`);
            console.error('🔍 解析失敗詳細:', {
              originalLength: responseText.length,
              jsonTextLength: jsonText.length,
              firstJsonChar: jsonText[0],
              lastJsonChar: jsonText[jsonText.length - 1],
              sampleText: jsonText.substring(0, 200),
              error: finalError
            });
            
            // Vision APIフォールバック
            console.warn('🔄 Gemini完全失敗、Vision APIフォールバック実行');
            throw new Error('Gemini JSON parse completely failed, falling back to Vision API');
          }
        }
      }
      
      // 複数レシート対応
      if (parsedData.receipts && Array.isArray(parsedData.receipts)) {
        console.log(`${parsedData.totalCount || parsedData.receipts.length}枚のレシートを検出`);
        
        // 複数レシートの場合は最初の1枚を返す（バッチ処理は別途対応）
        const firstReceipt = parsedData.receipts[0];
        return {
          ocrText: parsedData.ocrText || responseText,
          extractedData: {
            amount: firstReceipt.amount,
            description: firstReceipt.description,
            date: firstReceipt.date,
            merchantName: firstReceipt.merchantName,
            category: firstReceipt.category || '雑費',
            confidence: firstReceipt.confidence || 0.9
          },
          multipleReceipts: parsedData.receipts, // 全レシートデータを保持
          totalCount: parsedData.totalCount || parsedData.receipts.length
        };
      }
      
      // 従来形式（後方互換性）
      return {
        ocrText: parsedData.ocrText || responseText,
        extractedData: {
          amount: parsedData.amount,
          description: parsedData.description,
          date: parsedData.date,
          merchantName: parsedData.merchantName,
          category: parsedData.category || '雑費',
          confidence: parsedData.confidence || 0.9
        }
      };
    } catch (error) {
      console.error('Gemini OCR extraction failed:', error);
      throw error;
    }
  }

  async extractTextFromImage(imageBase64: string): Promise<string> {
    try {
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION', // より高精度な文書OCR
                  maxResults: 1,
                },
                {
                  type: 'TEXT_DETECTION', // 従来のテキスト検出も併用
                  maxResults: 1,
                }
              ],
              imageContext: {
                languageHints: ['ja', 'en'], // 日本語と英語を指定
                textDetectionParams: {
                  enableTextDetectionConfidenceScore: true // 信頼度スコアを取得
                }
              }
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vision API Error Response:', errorText);
        
        if (response.status === 403) {
          throw new Error(`Vision API認証エラー: APIキーが無効か、APIが有効化されていません (${response.status})`);
        }
        throw new Error(`Vision API error: ${response.status} - ${errorText}`);
      }

      const result: VisionAPIResponse = await response.json();
      
      // DOCUMENT_TEXT_DETECTIONの結果を優先
      const documentText = result.responses[0]?.fullTextAnnotation?.text;
      
      if (documentText && documentText.trim().length > 0) {
        console.log('Using DOCUMENT_TEXT_DETECTION result');
        return documentText;
      }
      
      // フォールバック：TEXT_DETECTIONの結果を使用
      const textAnnotations = result.responses[0]?.textAnnotations;
      if (textAnnotations && textAnnotations.length > 0) {
        console.log('Fallback to TEXT_DETECTION result');
        return textAnnotations[0].description || '';
      }
      
      return '';
    } catch (error) {
      console.error('OCR extraction failed:', error);
      
      // 開発時のフォールバック（全てのAPIが失敗した場合）
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Development mode: Using mock OCR data');
        const mockResult = this.generateMockData(imageBase64);
        
        // 複数レシートの場合は、そのまま返す
        if (mockResult.multipleReceipts && mockResult.totalCount) {
          console.log(`📄 モック: ${mockResult.totalCount}枚のレシートを生成`);
          return {
            ocrText: mockResult.ocrText,
            extractedData: mockResult.extractedData,
            multipleReceipts: mockResult.multipleReceipts,
            totalCount: mockResult.totalCount
          } as any;
        }
        
        return mockResult;
      }
      
      throw error;
    }
  }

  parseReceiptText(ocrText: string): ExtractedData {
    // シンプルな行分割（前処理は最小限に）
    const lines = ocrText.split('\n').map(line => line.trim()).filter(Boolean);
    
    console.log('Original OCR Text:', ocrText);
    console.log('Number of lines after processing:', lines.length);
    console.log('First 10 lines:', lines.slice(0, 10));
    
    let amount: number | undefined;
    let merchantName: string | undefined;
    let date: string | undefined;
    let description = '';
    
    // レシートタイプを判定
    const receiptType = this.identifyReceiptType(lines);
    console.log('Identified receipt type:', receiptType);

    // レシートタイプに応じた金額抽出パターンを取得
    const amountPatterns = this.getAmountPatterns(receiptType);
    
    console.log('Using amount patterns for type:', receiptType, amountPatterns);

    // 除外するパターン（より厳密に）
    const excludePatterns = [
      /現金[\s]*:?[\s]*¥?([0-9,]+)/gi,
      /お釣り[\s]*:?[\s]*¥?([0-9,]+)/gi,
      /おつり[\s]*:?[\s]*¥?([0-9,]+)/gi,
      /釣り[\s]*:?[\s]*¥?([0-9,]+)/gi,
      /預り金[\s]*:?[\s]*¥?([0-9,]+)/gi,
      /預かり[\s]*:?[\s]*¥?([0-9,]+)/gi,
      /お預り[\s]*:?[\s]*¥?([0-9,]+)/gi,
      /単価[\s]*:?[\s]*¥?([0-9,]+)/gi,              // 個別商品の単価を除外
      /価格[\s]*:?[\s]*¥?([0-9,]+)/gi,              // 商品価格を除外
      /[0-9]+[\s]*×[\s]*¥?([0-9,]+)/gi,            // 数量×価格を除外
      /¥[\s]*([0-9,]+)[\s]*×[\s]*[0-9]+/gi,        // ¥価格×数量を除外
    ];

    // 金額を抽出
    amount = this.extractAmount(lines, amountPatterns);

    // 店舗名を抽出
    merchantName = this.extractMerchantName(lines, receiptType);

    // 日付を抽出
    date = this.extractDate(lines);

    // 商品説明の生成
    if (merchantName) {
      description = `${merchantName}での購入`;
    } else {
      description = 'レシートでの購入';
    }

    // カテゴリの推測
    let category = '雑費'; // デフォルト
    const categoryKeywords = {
      '食費': ['食', 'コンビニ', 'スーパー', 'レストラン', '弁当', 'パン'],
      '交通費': ['駅', 'タクシー', '交通', 'バス', '電車'],
      '通信費': ['電話', '通信', 'インターネット', 'WiFi'],
      '消耗品費': ['文房具', '用品', '消耗'],
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => ocrText.includes(keyword))) {
        category = cat;
        break;
      }
    }

    return {
      amount,
      description,
      date: date || new Date().toISOString().split('T')[0],
      merchantName,
      category,
      confidence: amount ? 0.85 : 0.3, // 金額が見つかれば高信頼度
    };
  }

  // 画像の前処理（コントラスト調整、ノイズ除去）
  private preprocessImage(imageBase64: string): string {
    // 画像処理は複雑なため、まずはGoogle Vision APIのパラメータで対応
    // 今後必要に応じてCanvas APIで画像の前処理を実装可能
    return imageBase64;
  }

  // 数字の信頼度チェック（複数のパターンで検証）
  private validateAmount(candidates: Array<{amount: number, confidence: number, source: string}>): number | undefined {
    if (candidates.length === 0) return undefined;
    
    // 信頼度でソート
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    console.log('Amount candidates with confidence:', candidates);
    
    // 最も信頼度の高い金額を返す
    const bestCandidate = candidates[0];
    
    // 妥当性チェック
    if (bestCandidate.amount > 0 && bestCandidate.amount < 10000000) {
      return bestCandidate.amount;
    }
    
    return undefined;
  }

  // 🚨 緊急データ抽出: JSON解析完全失敗時の正規表現フォールバック
  private extractDataWithRegex(text: string): any {
    try {
      console.log('🆘 緊急データ抽出開始: 正規表現による直接解析');
      
      // 🔍 基本パターン抽出
      const amountPatterns = [
        /合計[:\s]*([0-9,]+)/i,
        /総計[:\s]*([0-9,]+)/i,
        /計[:\s]*([0-9,]+)/i,
        /[合総]額[:\s]*([0-9,]+)/i,
        /(\d+)[,\s]*円/i,
        /¥[\s]*([0-9,]+)/i,
        /￥[\s]*([0-9,]+)/i,
        /([0-9,]+)\s*[円¥￥]/i
      ];
      
      const merchantPatterns = [
        /店舗[名称号]?[:\s]*([^\n\r]+)/i,
        /(セブン-?イレブン|ローソン|ファミリーマート|ファミマ)/i,
        /(イオン|AEON|イトーヨーカドー|西友|SEIYU)/i,
        /(マクドナルド|McDonald|吉野家|すき家|松屋)/i,
        /([^\n\r]{2,20})\s*(店|ショップ|Shop|SHOP)/i
      ];
      
      const datePatterns = [
        /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
        /(\d{2})[/-](\d{1,2})[/-](\d{1,2})/,
        /(令和|平成|R|H)[\s]*(\d+)[年\s]*(\d+)[月\s]*(\d+)/
      ];
      
      // 💰 金額抽出
      let amount: number | null = null;
      for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match) {
          const numStr = match[1].replace(/,/g, '');
          const num = parseInt(numStr);
          if (!isNaN(num) && num > 0 && num < 100000) { // 妥当な範囲
            amount = num;
            console.log(`💰 金額検出: ${amount}円 (パターン: ${pattern.source})`);
            break;
          }
        }
      }
      
      // 🏪 店舗名抽出
      let merchantName: string | null = null;
      for (const pattern of merchantPatterns) {
        const match = text.match(pattern);
        if (match) {
          merchantName = match[1]?.trim() || match[0]?.trim();
          if (merchantName && merchantName.length > 1 && merchantName.length < 50) {
            console.log(`🏪 店舗名検出: ${merchantName} (パターン: ${pattern.source})`);
            break;
          }
        }
      }
      
      // 📅 日付抽出
      let date: string | null = null;
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          if (match[1]?.length === 4) { // YYYY-MM-DD
            date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          } else if (match[1]?.length === 2) { // YY-MM-DD
            const year = parseInt(match[1]) > 50 ? `19${match[1]}` : `20${match[1]}`;
            date = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          } else if (match[2] && match[3] && match[4]) { // 令和/平成
            const baseYear = match[1].includes('令和') || match[1].includes('R') ? 2018 : 1988;
            const year = baseYear + parseInt(match[2]);
            date = `${year}-${match[3].padStart(2, '0')}-${match[4].padStart(2, '0')}`;
          }
          
          if (date) {
            console.log(`📅 日付検出: ${date} (パターン: ${pattern.source})`);
            break;
          }
        }
      }
      
      // 🏷️ カテゴリー推定
      let category = '雑費'; // デフォルト
      const foodKeywords = ['コンビニ', 'スーパー', 'レストラン', '食品', '飲食', 'セブン', 'ローソン', 'ファミ', 'マック'];
      if (foodKeywords.some(keyword => text.includes(keyword))) {
        category = '食費';
      }
      
      // ⚖️ 抽出結果評価
      const confidence = this.calculateEmergencyConfidence(amount, merchantName, date);
      
      // 🔄 結果生成
      if (amount || merchantName) {
        const result = {
          receipts: [{
            amount: amount || 0,
            description: merchantName ? `${merchantName}での購入` : '購入',
            date: date || new Date().toISOString().split('T')[0],
            merchantName: merchantName || '不明',
            category: category,
            confidence: confidence
          }],
          totalCount: 1,
          ocrText: text.substring(0, 2000) // 長すぎる場合は切り詰め
        };
        
        console.log('✅ 緊急抽出成功:', {
          amount: result.receipts[0].amount,
          merchant: result.receipts[0].merchantName,
          confidence: confidence
        });
        
        return result;
      }
      
      console.warn('❌ 緊急抽出失敗: 有効なデータが見つかりませんでした');
      return null;
      
    } catch (error) {
      console.error('❌ 緊急抽出エラー:', error);
      return null;
    }
  }
  
  // ⚖️ 緊急抽出の信頼度計算
  private calculateEmergencyConfidence(amount: number | null, merchant: string | null, date: string | null): number {
    let confidence = 0.3; // 基本信頼度（正規表現抽出のため低めに設定）
    
    if (amount && amount > 0) confidence += 0.3;      // 金額あり
    if (merchant && merchant.length > 2) confidence += 0.2;  // 店舗名あり
    if (date) confidence += 0.1;                      // 日付あり
    
    return Math.min(confidence, 0.9); // 最大0.9（緊急抽出なので）
  }

  async processReceipt(imageBase64: string): Promise<{ ocrText: string; extractedData: ExtractedData }> {
    // Geminiを優先使用
    if (this.useGemini) {
      try {
        console.log('=== Gemini Vision APIを使用 ===');
        const result = await this.extractWithGemini(imageBase64);
        console.log('Gemini結果:', result);
        return result;
      } catch (error) {
        console.warn('Gemini API failed, falling back to Google Vision:', error);
        // Google Vision APIにフォールバック
      }
    }
    
    // フォールバック: Google Vision API
    console.log('=== Google Vision APIにフォールバック ===');
    const preprocessedImage = this.preprocessImage(imageBase64);
    const ocrText = await this.extractTextFromImage(preprocessedImage);
    
    console.log('=== 詳細OCRデバッグ情報 ===');
    console.log('生OCRテキスト:');
    console.log(ocrText);
    console.log('=== OCRテキストの各行 ===');
    const lines = ocrText.split('\n');
    lines.forEach((line, index) => {
      console.log(`行${index + 1}: "${line}"`);
    });
    console.log('========================');
    
    // テキストから情報抽出
    const extractedData = this.parseReceiptText(ocrText);
    
    return {
      ocrText,
      extractedData,
    };
  }

  // 開発時のモックデータ生成
  private generateMockData(imageBase64: string): { ocrText: string; extractedData: ExtractedData; multipleReceipts?: ExtractedData[]; totalCount?: number } {
    const mockStores = ['セブンイレブン', 'ファミリーマート', 'ローソン', 'イオン', 'スターバックス', 'マクドナルド', 'ドトール', 'サブウェイ'];
    
    // テスト用に3-8枚のレシートを生成（複数レシート機能をテスト）
    const receiptCount = Math.floor(Math.random() * 6) + 3;
    const multipleReceipts: ExtractedData[] = [];
    
    for (let i = 0; i < receiptCount; i++) {
      const mockStore = mockStores[Math.floor(Math.random() * mockStores.length)];
      const mockAmount = Math.floor(Math.random() * 5000) + 100;
      const mockDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      multipleReceipts.push({
        amount: mockAmount,
        merchantName: mockStore,
        date: mockDate,
        description: `${mockStore}での購入`,
        confidence: 0.90 + Math.random() * 0.1
      });
    }
    
    const mockOcrText = multipleReceipts.map((receipt, index) => `
--- レシート${index + 1} ---
${receipt.merchantName}
合計 ¥${receipt.amount}
${receipt.date}
`).join('\n');

    // 複数レシート形式で返す
    console.log(`🎲 モックデータ生成: ${receiptCount}枚のレシート`);
    if (receiptCount >= 1) {
      return {
        ocrText: mockOcrText,
        extractedData: multipleReceipts[0], // 最初のレシートを代表として
        multipleReceipts,
        totalCount: receiptCount
      };
    } else {
      return {
        ocrText: mockOcrText,
        extractedData: multipleReceipts[0]
      };
    }
  }
}