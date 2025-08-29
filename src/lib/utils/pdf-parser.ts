// pdf-parseのdynamic importを使用（サーバーサイドでのみ使用）
const loadPdfParse = async () => {
  const pdfParse = await import('pdf-parse');
  return pdfParse.default;
};

export interface PDFTransactionData {
  date: string;
  amount: number;
  description: string;
  category?: string;
  originalData: any;
}

interface PDFParseResult {
  transactions: PDFTransactionData[];
  format: string;
  errors: string[];
  isTextBased: boolean;
}

// PDFテキストから取引データを抽出するパターン
interface PDFPattern {
  name: string;
  detector: (text: string) => boolean;
  extractor: (text: string) => PDFTransactionData[];
}

// 日付パターンのマッチング
function extractDate(dateStr: string): string {
  const datePatterns = [
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,     // 2024/1/15
    /(\d{4})-(\d{1,2})-(\d{1,2})/,      // 2024-1-15
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,    // 1/15/2024
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,    // 2024年1月15日
    /(\d{2})\/(\d{2})/,                 // 01/15 (年は推定)
    /(\d{1,2})月(\d{1,2})日/,           // 1月15日
  ];

  const currentYear = new Date().getFullYear();
  
  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      let year, month, day;
      
      if (pattern.toString().includes('年')) {
        // 日本語形式
        if (match.length === 4) {
          [, year, month, day] = match;
        } else {
          // 年なしの場合
          [, month, day] = match;
          year = currentYear.toString();
        }
      } else if (pattern.toString().includes('(\\d{4})')) {
        // 年が先頭
        [, year, month, day] = match;
      } else if (match.length === 3) {
        // MM/DD形式（年なし）
        [, month, day] = match;
        year = currentYear.toString();
      } else {
        // MM/DD/YYYY形式
        [, month, day, year] = match;
      }
      
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
  }
  
  return dateStr;
}

// 金額抽出
function extractAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  const cleanAmount = amountStr
    .replace(/[,¥￥円]/g, '')
    .replace(/^\s+|\s+$/g, '');
  
  const isNegative = cleanAmount.includes('-') || 
                    cleanAmount.includes('△') ||
                    cleanAmount.includes('▲') ||
                    (cleanAmount.includes('(') && cleanAmount.includes(')'));
  
  const numericValue = parseFloat(cleanAmount.replace(/[^\d.]/g, ''));
  return isNegative ? -Math.abs(numericValue) : numericValue;
}

// 楽天カードPDF形式
const rakutenCardPDFPattern: PDFPattern = {
  name: '楽天カード明細PDF',
  detector: (text) => {
    return text.includes('楽天カード') && 
           (text.includes('ご利用明細書') || text.includes('利用明細')) &&
           text.includes('ご利用日');
  },
  extractor: (text) => {
    const transactions: PDFTransactionData[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    // 楽天カード明細の特徴的なパターンを探す
    let inTransactionSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 取引セクションの開始を検出
      if (line.includes('ご利用日') && line.includes('ご利用店名') && line.includes('ご利用金額')) {
        inTransactionSection = true;
        continue;
      }
      
      // 取引セクションの終了を検出
      if (inTransactionSection && (line.includes('合計') || line.includes('月々のお支払い'))) {
        break;
      }
      
      if (inTransactionSection && line.length > 10) {
        // 取引行のパターンマッチング
        // 例: "2024/01/15 コンビニA 1,500"
        const transactionMatch = line.match(/(\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2})\s+(.+?)\s+([▲\-]?[\d,]+)/);
        
        if (transactionMatch) {
          const [, date, description, amount] = transactionMatch;
          
          transactions.push({
            date: extractDate(date),
            amount: -Math.abs(extractAmount(amount)), // クレジットカードは支出
            description: description.trim(),
            originalData: { format: '楽天カード明細PDF', line }
          });
        }
      }
    }
    
    return transactions;
  }
};

// 銀行PDF明細形式
const bankPDFPattern: PDFPattern = {
  name: '銀行明細PDF',
  detector: (text) => {
    return (text.includes('入出金明細') || text.includes('取引明細') || text.includes('残高推移')) &&
           (text.includes('日付') || text.includes('取引日')) &&
           (text.includes('摘要') || text.includes('内容'));
  },
  extractor: (text) => {
    const transactions: PDFTransactionData[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let inTransactionSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // ヘッダー行の検出
      if (trimmedLine.includes('日付') && trimmedLine.includes('摘要')) {
        inTransactionSection = true;
        continue;
      }
      
      if (inTransactionSection && trimmedLine.length > 5) {
        // 銀行明細のパターンマッチング
        // 例: "2024/01/15 振込 田中太郎 10,000 1,500,000"
        const bankMatch = trimmedLine.match(/(\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2})\s+(.+?)\s+([▲\-]?[\d,]+)\s+[\d,]+$/);
        
        if (bankMatch) {
          const [, date, description, amount] = bankMatch;
          
          transactions.push({
            date: extractDate(date),
            amount: extractAmount(amount),
            description: description.trim(),
            originalData: { format: '銀行明細PDF', line }
          });
        }
      }
    }
    
    return transactions;
  }
};

// PayPayカード明細形式
const payPayCardPDFPattern: PDFPattern = {
  name: 'PayPayカード明細PDF',
  detector: (text) => {
    return text.includes('PayPay') && text.includes('カード') &&
           text.includes('ご利用明細') &&
           text.includes('利用日');
  },
  extractor: (text) => {
    const transactions: PDFTransactionData[] = [];
    const lines = text.split('\n');
    
    let inTransactionSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('利用日') && trimmedLine.includes('利用店舗') && trimmedLine.includes('利用金額')) {
        inTransactionSection = true;
        continue;
      }
      
      if (inTransactionSection && trimmedLine.length > 10) {
        const payPayMatch = trimmedLine.match(/(\d{1,2}\/\d{1,2})\s+(.+?)\s+([▲\-]?[\d,]+)/);
        
        if (payPayMatch) {
          const [, date, description, amount] = payPayMatch;
          
          transactions.push({
            date: extractDate(date),
            amount: -Math.abs(extractAmount(amount)),
            description: description.trim(),
            originalData: { format: 'PayPayカード明細PDF', line }
          });
        }
      }
    }
    
    return transactions;
  }
};

// 三井住友カード明細PDF形式
const smccPDFPattern: PDFPattern = {
  name: '三井住友カード明細PDF',
  detector: (text) => {
    return text.includes('三井住友') && text.includes('カード') &&
           (text.includes('ご利用明細書') || text.includes('明細書')) &&
           text.includes('利用日');
  },
  extractor: (text) => {
    const transactions: PDFTransactionData[] = [];
    const lines = text.split('\n');
    
    let inTransactionSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('利用日') && trimmedLine.includes('利用店名') && trimmedLine.includes('利用金額')) {
        inTransactionSection = true;
        continue;
      }
      
      if (inTransactionSection && trimmedLine.length > 10) {
        const smccMatch = trimmedLine.match(/(\d{1,2}\/\d{1,2})\s+(.+?)\s+([▲\-]?[\d,]+)/);
        
        if (smccMatch) {
          const [, date, description, amount] = smccMatch;
          
          transactions.push({
            date: extractDate(date),
            amount: -Math.abs(extractAmount(amount)),
            description: description.trim(),
            originalData: { format: '三井住友カード明細PDF', line }
          });
        }
      }
    }
    
    return transactions;
  }
};

// 汎用PDF明細パターン
const genericPDFPattern: PDFPattern = {
  name: '汎用PDF明細',
  detector: (text) => {
    return text.includes('明細') || text.includes('利用') || text.includes('取引');
  },
  extractor: (text) => {
    const transactions: PDFTransactionData[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 汎用的なパターン（日付 + 説明 + 金額）
      const genericMatch = trimmedLine.match(/(\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2})\s+(.{5,50}?)\s+([▲\-]?[\d,]+)/);
      
      if (genericMatch && trimmedLine.length > 15) {
        const [, date, description, amount] = genericMatch;
        
        // 明らかにヘッダー行やフッター行を除外
        if (!description.includes('日付') && 
            !description.includes('合計') && 
            !description.includes('小計') &&
            !description.includes('税込') &&
            extractAmount(amount) !== 0) {
          
          transactions.push({
            date: extractDate(date),
            amount: extractAmount(amount),
            description: description.trim(),
            originalData: { format: '汎用PDF明細', line }
          });
        }
      }
    }
    
    return transactions;
  }
};

const PDF_PATTERNS: PDFPattern[] = [
  rakutenCardPDFPattern,
  bankPDFPattern,
  payPayCardPDFPattern,
  smccPDFPattern,
  genericPDFPattern, // 最後に汎用パターン
];

// PDFファイルからテキストを抽出
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log('pdf-parseライブラリを試行中...');
    
    // pdf-parseを完全に新しい方法で試行
    const pdfParse = await import('pdf-parse');
    const parseFunction = pdfParse.default || pdfParse;
    
    // 最小限のオプションで実行
    const data = await parseFunction(pdfBuffer, {
      version: false,
      max: 0,
      // 他のオプションを無効化
      pagerender: undefined,
      normalizeWhitespace: true
    });
    
    console.log('pdf-parse成功 - テキスト長:', data.text?.length || 0);
    return data.text || '';
  } catch (error) {
    console.error('pdf-parse失敗:', error);
    
    // フォールバック: 基本的なPDFテキスト抽出を試行
    try {
      console.log('フォールバック: 基本的なテキスト抽出を試行...');
      const text = await extractTextFromPDFFallback(pdfBuffer);
      console.log('フォールバック成功 - テキスト長:', text.length);
      return text;
    } catch (fallbackError) {
      console.error('フォールバックも失敗:', fallbackError);
      throw new Error(`PDFテキスト抽出エラー: ${error}`);
    }
  }
}

// フォールバック用の簡易テキスト抽出
async function extractTextFromPDFFallback(pdfBuffer: Buffer): Promise<string> {
  // PDFの基本的な構造を解析してテキストを抽出する簡易版
  const pdfString = pdfBuffer.toString('binary');
  
  // PDFストリーム内のテキストを検索
  const textMatches = pdfString.match(/BT\s+(.*?)\s+ET/gs);
  
  if (!textMatches) {
    return '';
  }
  
  let extractedText = '';
  for (const match of textMatches) {
    // 基本的なPDFテキストコマンドを解析
    const textCommands = match.match(/\((.*?)\)\s*Tj/gs);
    if (textCommands) {
      for (const cmd of textCommands) {
        const text = cmd.match(/\((.*?)\)/);
        if (text && text[1]) {
          extractedText += text[1] + ' ';
        }
      }
    }
  }
  
  return extractedText.trim();
}

// PDFが画像ベースかテキストベースかを判定（改善版）
export function isPDFTextBased(text: string): boolean {
  if (!text) {
    return false;
  }

  const cleanText = text.replace(/\s+/g, ' ').trim();
  console.log('PDF判定 - クリーンテキスト長:', cleanText.length);
  console.log('PDF判定 - 最初の100文字:', cleanText.substring(0, 100));
  
  // 空白文字の割合をチェック（画像PDFは空白文字が異常に多い）
  const nonWhitespaceCount = (text.match(/\S/g) || []).length;
  const whitespaceRatio = 1 - (nonWhitespaceCount / text.length);
  console.log('PDF判定 - 空白文字比率:', Math.round(whitespaceRatio * 100) + '%');
  
  // 空白文字が95%以上の場合は画像PDF
  if (whitespaceRatio > 0.95) {
    return false;
  }
  
  // 意味のある単語が含まれているかチェック（楽天カード特有）
  const cardKeywords = [
    '楽天カード', 'ご利用明細', 'ご利用日', 'ご利用店名', 'ご利用金額',
    '三井住友', 'PayPay', '利用日', '利用店舗', '利用金額',
    '明細書', '取引', '振込', '引出', '入金'
  ];
  
  const foundKeywords = cardKeywords.filter(keyword => cleanText.includes(keyword));
  console.log('PDF判定 - 見つかったキーワード:', foundKeywords);
  
  // キーワードが見つかった場合はテキストベース
  if (foundKeywords.length > 0) {
    return true;
  }
  
  // 数値パターンと日付パターンの存在チェック
  const numberPattern = /\d{1,3}(,\d{3})*(\.\d+)?/g;
  const datePattern = /\d{1,4}[\/\-年月日]\d{1,2}[\/\-月日]/g;
  
  const numbers = cleanText.match(numberPattern) || [];
  const dates = cleanText.match(datePattern) || [];
  
  console.log('PDF判定 - 数値パターン:', numbers.length, '個');
  console.log('PDF判定 - 日付パターン:', dates.length, '個');
  
  // 意味のある数値と日付が複数あればテキストベース
  if (numbers.length >= 3 && dates.length >= 2) {
    return true;
  }
  
  // 総合的な判定
  const significantTextThreshold = 50; // 閾値を下げる
  const hasSignificantText = nonWhitespaceCount >= significantTextThreshold;
  
  console.log('PDF判定 - 有意なテキスト:', hasSignificantText);
  console.log('PDF判定 - 最終判定:', hasSignificantText ? 'テキストベース' : '画像ベース');
  
  return hasSignificantText;
}

// PDFテキストから取引データを抽出
export function parsePDFText(text: string): PDFParseResult {
  if (!text || text.trim().length < 10) {
    return {
      transactions: [],
      format: 'unknown',
      errors: ['PDFからテキストを抽出できませんでした'],
      isTextBased: false
    };
  }
  
  const isTextBased = isPDFTextBased(text);
  
  if (!isTextBased) {
    return {
      transactions: [],
      format: 'image-pdf',
      errors: [
        '画像ベースのPDFが検出されました',
        'このPDFはスキャンされた画像形式のため、現在対応しておりません',
        '以下の方法をお試しください：',
        '1. カード会社・銀行サイトからCSVファイルをダウンロード（推奨）',
        '2. テキスト形式のPDFがある場合は、そちらをご利用ください',
        '3. 手動で取引データを入力してください'
      ],
      isTextBased: false
    };
  }
  
  // パターンマッチングで適切な形式を検出
  for (const pattern of PDF_PATTERNS) {
    if (pattern.detector(text)) {
      try {
        const transactions = pattern.extractor(text);
        
        if (transactions.length > 0) {
          return {
            transactions,
            format: pattern.name,
            errors: [],
            isTextBased: true
          };
        }
      } catch (error) {
        console.error(`PDF解析エラー (${pattern.name}):`, error);
      }
    }
  }
  
  return {
    transactions: [],
    format: 'unsupported',
    errors: [
      '対応していないPDF形式です',
      'テキストが含まれていますが、取引明細を識別できませんでした',
      '現在対応している形式：',
      '• 楽天カード明細PDF',
      '• 三井住友カード明細PDF', 
      '• PayPayカード明細PDF',
      '• 銀行明細PDF（入出金明細）',
      '',
      '推奨される解決方法：',
      '1. カード会社・銀行サイトからCSVファイルをダウンロード',
      '2. 取引データを手動で入力',
      '3. 対応形式のPDFがある場合は、そちらをご利用ください'
    ],
    isTextBased: true
  };
}

// PDFファイル全体の処理
export async function parsePDF(pdfBuffer: Buffer): Promise<PDFParseResult> {
  try {
    console.log('PDF解析開始 - ファイルサイズ:', pdfBuffer.length, 'bytes');
    const text = await extractTextFromPDF(pdfBuffer);
    console.log('抽出されたテキスト長:', text.length);
    console.log('テキストサンプル:', text.substring(0, 200));
    
    return parsePDFText(text);
  } catch (error) {
    console.error('PDF処理エラー詳細:', error);
    return {
      transactions: [],
      format: 'error',
      errors: [`PDF処理エラー: ${error}`],
      isTextBased: false
    };
  }
}

// 重複検出（既存のCSVパーサーと同じロジック）
export function generatePDFTransactionHash(transaction: PDFTransactionData): string {
  return `${transaction.date}_${transaction.amount}_${transaction.description.substring(0, 20)}`;
}

export function deduplicatePDFTransactions(
  newTransactions: PDFTransactionData[],
  existingTransactions: PDFTransactionData[]
): {
  unique: PDFTransactionData[];
  duplicates: PDFTransactionData[];
} {
  const existingHashes = new Set(
    existingTransactions.map(generatePDFTransactionHash)
  );

  const unique: PDFTransactionData[] = [];
  const duplicates: PDFTransactionData[] = [];

  for (const transaction of newTransactions) {
    const hash = generatePDFTransactionHash(transaction);
    if (existingHashes.has(hash)) {
      duplicates.push(transaction);
    } else {
      unique.push(transaction);
      existingHashes.add(hash);
    }
  }

  return { unique, duplicates };
}