interface TransactionData {
  date: string;
  amount: number;
  description: string;
  category?: string;
  originalData: any;
}

interface CSVFormat {
  name: string;
  detector: (headers: string[]) => boolean;
  parser: (row: string[], headers: string[]) => TransactionData | null;
}

// 日付文字列を標準形式に変換
function parseDate(dateStr: string): string {
  // 様々な日付形式に対応
  const datePatterns = [
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,     // 2024/1/15
    /(\d{4})-(\d{1,2})-(\d{1,2})/,      // 2024-1-15
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,    // 1/15/2024
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,    // 2024年1月15日
  ];

  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      let year, month, day;
      if (pattern.toString().includes('年')) {
        // 日本語形式
        [, year, month, day] = match;
      } else if (pattern.toString().includes('(\\d{4})')) {
        // 年が先頭
        [, year, month, day] = match;
      } else {
        // MM/DD/YYYY形式
        [, month, day, year] = match;
      }
      
      // 日付を標準形式 (YYYY-MM-DD) に変換
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
  }

  // パースできない場合は元の文字列を返す
  return dateStr;
}

// 金額文字列を数値に変換
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // カンマを除去して数値に変換
  const cleanAmount = amountStr
    .replace(/[,¥￥円]/g, '')
    .replace(/^\s+|\s+$/g, '');
  
  // マイナスの判定（括弧や△記号も考慮）
  const isNegative = cleanAmount.includes('-') || 
                    cleanAmount.includes('△') ||
                    (cleanAmount.includes('(') && cleanAmount.includes(')'));
  
  const numericValue = parseFloat(cleanAmount.replace(/[^\d.]/g, ''));
  return isNegative ? -numericValue : numericValue;
}

// CSV行をパースする関数（引用符対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされた引用符
        current += '"';
        i += 2;
      } else {
        // 引用符の開始/終了
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // カンマで区切り
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // 最後の項目を追加
  result.push(current.trim());
  
  return result;
}

// 楽天カード形式
const rakutenCardFormat: CSVFormat = {
  name: '楽天カード',
  detector: (headers) => {
    const joinedHeaders = headers.join(',').toLowerCase();
    return joinedHeaders.includes('利用日') && joinedHeaders.includes('利用店名') && joinedHeaders.includes('利用金額');
  },
  parser: (row, headers) => {
    const dateIndex = headers.findIndex(h => h.includes('利用日'));
    const shopIndex = headers.findIndex(h => h.includes('利用店名') || h.includes('商品名'));
    const amountIndex = headers.findIndex(h => h.includes('利用金額') || h.includes('請求額'));

    if (dateIndex === -1 || shopIndex === -1 || amountIndex === -1) return null;

    return {
      date: parseDate(row[dateIndex] || ''),
      amount: -Math.abs(parseAmount(row[amountIndex] || '0')), // クレジットカードは支出
      description: row[shopIndex] || '',
      category: undefined,
      originalData: { format: '楽天カード', row, headers }
    };
  }
};

// 三井住友カード形式
const smccFormat: CSVFormat = {
  name: '三井住友カード',
  detector: (headers) => {
    const joinedHeaders = headers.join(',').toLowerCase();
    return joinedHeaders.includes('利用日') && joinedHeaders.includes('利用店名') && !joinedHeaders.includes('支払区分');
  },
  parser: (row, headers) => {
    const dateIndex = headers.findIndex(h => h.includes('利用日'));
    const shopIndex = headers.findIndex(h => h.includes('利用店名'));
    const amountIndex = headers.findIndex(h => h.includes('利用金額'));

    if (dateIndex === -1 || shopIndex === -1 || amountIndex === -1) return null;

    return {
      date: parseDate(row[dateIndex] || ''),
      amount: -Math.abs(parseAmount(row[amountIndex] || '0')),
      description: row[shopIndex] || '',
      category: undefined,
      originalData: { format: '三井住友カード', row, headers }
    };
  }
};

// 銀行明細形式
const bankFormat: CSVFormat = {
  name: '銀行明細',
  detector: (headers) => {
    const joinedHeaders = headers.join(',').toLowerCase();
    return (joinedHeaders.includes('日付') || joinedHeaders.includes('取引日')) && 
           (joinedHeaders.includes('摘要') || joinedHeaders.includes('内容')) &&
           (joinedHeaders.includes('出金') || joinedHeaders.includes('入金') || joinedHeaders.includes('金額'));
  },
  parser: (row, headers) => {
    const dateIndex = headers.findIndex(h => h.includes('日付') || h.includes('取引日'));
    const descIndex = headers.findIndex(h => h.includes('摘要') || h.includes('内容'));
    const withdrawalIndex = headers.findIndex(h => h.includes('出金'));
    const depositIndex = headers.findIndex(h => h.includes('入金'));
    const amountIndex = headers.findIndex(h => h.includes('金額') && !h.includes('出金') && !h.includes('入金'));

    if (dateIndex === -1 || descIndex === -1) return null;

    let amount = 0;
    if (amountIndex !== -1) {
      // 単一の金額カラム
      amount = parseAmount(row[amountIndex] || '0');
    } else if (withdrawalIndex !== -1 || depositIndex !== -1) {
      // 出金・入金分離
      const withdrawal = withdrawalIndex !== -1 ? parseAmount(row[withdrawalIndex] || '0') : 0;
      const deposit = depositIndex !== -1 ? parseAmount(row[depositIndex] || '0') : 0;
      amount = deposit - withdrawal;
    }

    return {
      date: parseDate(row[dateIndex] || ''),
      amount,
      description: row[descIndex] || '',
      category: undefined,
      originalData: { format: '銀行明細', row, headers }
    };
  }
};

// 共通形式
const commonFormat: CSVFormat = {
  name: '共通形式',
  detector: (headers) => {
    const joinedHeaders = headers.join(',').toLowerCase();
    return joinedHeaders.includes('日付') && joinedHeaders.includes('金額') && 
           (joinedHeaders.includes('摘要') || joinedHeaders.includes('内容') || joinedHeaders.includes('説明'));
  },
  parser: (row, headers) => {
    const dateIndex = headers.findIndex(h => h.includes('日付'));
    const amountIndex = headers.findIndex(h => h.includes('金額'));
    const descIndex = headers.findIndex(h => h.includes('摘要') || h.includes('内容') || h.includes('説明'));
    const categoryIndex = headers.findIndex(h => h.includes('カテゴリ'));

    if (dateIndex === -1 || amountIndex === -1 || descIndex === -1) return null;

    return {
      date: parseDate(row[dateIndex] || ''),
      amount: parseAmount(row[amountIndex] || '0'),
      description: row[descIndex] || '',
      category: categoryIndex !== -1 ? row[categoryIndex] : undefined,
      originalData: { format: '共通形式', row, headers }
    };
  }
};

const CSV_FORMATS: CSVFormat[] = [
  rakutenCardFormat,
  smccFormat,
  bankFormat,
  commonFormat
];

export function parseCSV(csvContent: string): {
  transactions: TransactionData[];
  format: string;
  errors: string[];
} {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return { transactions: [], format: 'unknown', errors: ['CSVファイルが空かヘッダーのみです'] };
    }

    // ヘッダー行を解析（より堅牢なCSVパース）
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

  // 適切な形式を検出
  const detectedFormat = CSV_FORMATS.find(format => format.detector(headers));
  if (!detectedFormat) {
    return { 
      transactions: [], 
      format: 'unknown', 
      errors: [`サポートされていないCSV形式です。ヘッダー: ${headers.join(', ')}`] 
    };
  }

  const transactions: TransactionData[] = [];
  const errors: string[] = [];

    // データ行を解析
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const row = parseCSVLine(line);
        const transaction = detectedFormat.parser(row, headers);
        
        if (transaction && transaction.date && transaction.description) {
          transactions.push(transaction);
        } else if (transaction === null) {
          errors.push(`${i + 1}行目: データが不正です`);
        }
      } catch (error) {
        errors.push(`${i + 1}行目: 解析エラー - ${error}`);
      }
    }

    return {
      transactions,
      format: detectedFormat.name,
      errors
    };
  } catch (error) {
    console.error('CSV解析エラー:', error);
    return { 
      transactions: [], 
      format: 'error', 
      errors: [`CSV解析中にエラーが発生しました: ${error}`] 
    };
  }
}

// 重複チェック用の関数
export function generateTransactionHash(transaction: TransactionData): string {
  return `${transaction.date}_${transaction.amount}_${transaction.description.substring(0, 20)}`;
}

// 重複を検出・マージする関数
export function deduplicateTransactions(
  newTransactions: TransactionData[],
  existingTransactions: TransactionData[]
): {
  unique: TransactionData[];
  duplicates: TransactionData[];
} {
  const existingHashes = new Set(
    existingTransactions.map(generateTransactionHash)
  );

  const unique: TransactionData[] = [];
  const duplicates: TransactionData[] = [];

  for (const transaction of newTransactions) {
    const hash = generateTransactionHash(transaction);
    if (existingHashes.has(hash)) {
      duplicates.push(transaction);
    } else {
      unique.push(transaction);
      existingHashes.add(hash);
    }
  }

  return { unique, duplicates };
}