/**
 * データエクスポート機能
 * CSV、Excel（XLSX）形式での取引データ、レシート、レポートの出力
 */

// ExcelJS library for creating Excel files
// We'll use a client-side approach that doesn't require ExcelJS installation
export interface TransactionData {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  categoryName?: string;
  isBusiness: boolean;
  merchantName?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  dateRange?: {
    start: string;
    end: string;
  };
  includeBusiness?: boolean;
  includePersonal?: boolean;
  categories?: string[];
  includeReceipts?: boolean;
}

/**
 * 取引データをCSV形式でエクスポート
 */
export function exportTransactionsToCSV(
  transactions: TransactionData[],
  filename?: string
): void {
  const headers = [
    '日付',
    '種別',
    '金額',
    '説明',
    'カテゴリID',
    'カテゴリ名',
    '事業用',
    '店舗名',
    'レシートURL',
    '備考'
  ];

  const csvContent = [
    headers.join(','),
    ...transactions.map(transaction => [
      transaction.date,
      transaction.type === 'income' ? '収入' : '支出',
      transaction.amount.toString(),
      `"${(transaction.description || '').replace(/"/g, '""')}"`, // CSV escape
      transaction.category || '',
      `"${(transaction.categoryName || '').replace(/"/g, '""')}"`,
      transaction.isBusiness ? '事業用' : '個人用',
      `"${(transaction.merchantName || '').replace(/"/g, '""')}"`,
      transaction.receiptUrl || '',
      `"${(transaction.notes || '').replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  }); // UTF-8 BOM for Japanese characters
  
  downloadFile(blob, filename || `取引データ_${getCurrentDateString()}.csv`);
}

/**
 * 取引データをExcel形式でエクスポート（簡易版）
 * クライアントサイドでExcelファイルを生成
 */
export function exportTransactionsToExcel(
  transactions: TransactionData[],
  filename?: string
): void {
  // HTMLテーブルをExcelに変換する方式
  const headers = [
    '日付',
    '種別',
    '金額',
    '説明',
    'カテゴリID',
    'カテゴリ名',
    '事業用',
    '店舗名',
    'レシートURL',
    '備考'
  ];

  let tableHTML = '<table border="1">';
  
  // ヘッダー行
  tableHTML += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
  
  // データ行
  transactions.forEach(transaction => {
    tableHTML += '<tr>';
    tableHTML += `<td>${transaction.date}</td>`;
    tableHTML += `<td>${transaction.type === 'income' ? '収入' : '支出'}</td>`;
    tableHTML += `<td>${transaction.amount}</td>`;
    tableHTML += `<td>${transaction.description || ''}</td>`;
    tableHTML += `<td>${transaction.category || ''}</td>`;
    tableHTML += `<td>${transaction.categoryName || ''}</td>`;
    tableHTML += `<td>${transaction.isBusiness ? '事業用' : '個人用'}</td>`;
    tableHTML += `<td>${transaction.merchantName || ''}</td>`;
    tableHTML += `<td>${transaction.receiptUrl || ''}</td>`;
    tableHTML += `<td>${transaction.notes || ''}</td>`;
    tableHTML += '</tr>';
  });
  
  tableHTML += '</table>';

  const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
  downloadFile(blob, filename || `取引データ_${getCurrentDateString()}.xlsx`);
}

/**
 * レポートデータをCSVでエクスポート
 */
export function exportReportToCSV(reportData: {
  period: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    transactionCount: number;
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  businessExpenses: number;
  personalExpenses: number;
}, filename?: string): void {
  
  const csvLines = [
    '# 財務レポート',
    `# 期間: ${reportData.period}`,
    `# 生成日時: ${new Date().toLocaleString('ja-JP')}`,
    '',
    '## サマリー',
    '項目,金額',
    `総収入,${reportData.summary.totalIncome}`,
    `総支出,${reportData.summary.totalExpenses}`,
    `純利益,${reportData.summary.netIncome}`,
    `取引件数,${reportData.summary.transactionCount}`,
    `事業用支出,${reportData.businessExpenses}`,
    `個人用支出,${reportData.personalExpenses}`,
    '',
    '## カテゴリ別内訳',
    'カテゴリ,金額,割合(%)',
    ...reportData.categoryBreakdown.map(item => 
      `"${item.category}",${item.amount},${item.percentage.toFixed(1)}`
    )
  ];

  const csvContent = csvLines.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });

  downloadFile(blob, filename || `財務レポート_${reportData.period}_${getCurrentDateString()}.csv`);
}

/**
 * 年次税務データをエクスポート（確定申告用）
 */
export function exportTaxDataToCSV(taxData: {
  year: string;
  totalIncome: number;
  businessExpenses: number;
  netIncome: number;
  deductions: {
    basic: number;
    blueForm: number;
    socialInsurance: number;
    other: number;
  };
  taxCalculation: {
    incomeTax: number;
    residenceTax: number;
    businessTax: number;
    totalTax: number;
  };
  expensesByCategory: Array<{
    category: string;
    amount: number;
  }>;
}, filename?: string): void {

  const csvLines = [
    '# 年次税務データ（確定申告用）',
    `# 対象年度: ${taxData.year}`,
    `# 生成日時: ${new Date().toLocaleString('ja-JP')}`,
    '',
    '## 所得計算',
    '項目,金額',
    `総収入,${taxData.totalIncome}`,
    `必要経費,${taxData.businessExpenses}`,
    `所得金額,${taxData.netIncome}`,
    '',
    '## 控除内訳',
    '控除種類,金額',
    `基礎控除,${taxData.deductions.basic}`,
    `青色申告特別控除,${taxData.deductions.blueForm}`,
    `社会保険料控除,${taxData.deductions.socialInsurance}`,
    `その他控除,${taxData.deductions.other}`,
    '',
    '## 税額計算',
    '税目,金額',
    `所得税,${taxData.taxCalculation.incomeTax}`,
    `住民税,${taxData.taxCalculation.residenceTax}`,
    `事業税,${taxData.taxCalculation.businessTax}`,
    `合計税額,${taxData.taxCalculation.totalTax}`,
    '',
    '## 経費内訳（カテゴリ別）',
    'カテゴリ,金額',
    ...taxData.expensesByCategory.map(item => 
      `"${item.category}",${item.amount}`
    )
  ];

  const csvContent = csvLines.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });

  downloadFile(blob, filename || `税務データ_${taxData.year}_${getCurrentDateString()}.csv`);
}

/**
 * レシートデータをCSVでエクスポート
 */
export function exportReceiptsToCSV(receipts: Array<{
  id: string;
  date: string;
  amount: number;
  description: string;
  merchantName: string;
  category?: string;
  categoryName?: string;
  isBusiness: boolean;
  imageUrl?: string;
  ocrText?: string;
  confidence?: number;
}>, filename?: string): void {

  const headers = [
    '日付',
    '金額',
    '説明',
    '店舗名',
    'カテゴリID',
    'カテゴリ名',
    '事業用',
    'レシート画像URL',
    'OCRテキスト',
    'AI信頼度'
  ];

  const csvContent = [
    headers.join(','),
    ...receipts.map(receipt => [
      receipt.date,
      receipt.amount.toString(),
      `"${(receipt.description || '').replace(/"/g, '""')}"`,
      `"${(receipt.merchantName || '').replace(/"/g, '""')}"`,
      receipt.category || '',
      `"${(receipt.categoryName || '').replace(/"/g, '""')}"`,
      receipt.isBusiness ? '事業用' : '個人用',
      receipt.imageUrl || '',
      `"${(receipt.ocrText || '').replace(/"/g, '""').substring(0, 100)}"`, // OCRテキストは100文字まで
      receipt.confidence ? receipt.confidence.toFixed(2) : ''
    ].join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  downloadFile(blob, filename || `レシートデータ_${getCurrentDateString()}.csv`);
}

/**
 * 複数形式での一括エクスポート
 */
export function exportAllData(data: {
  transactions: TransactionData[];
  receipts: Array<any>;
  reportData: any;
  taxData?: any;
}): void {
  
  // 日時を含むフォルダ名風のプレフィックス
  const timestamp = getCurrentDateString();
  const prefix = `keiri_export_${timestamp}`;

  // 個別にダウンロード（ブラウザの制限で同時ダウンロードは難しい）
  setTimeout(() => exportTransactionsToCSV(data.transactions, `${prefix}_取引データ.csv`), 100);
  setTimeout(() => exportReceiptsToCSV(data.receipts, `${prefix}_レシート.csv`), 200);
  setTimeout(() => exportReportToCSV(data.reportData, `${prefix}_レポート.csv`), 300);
  
  if (data.taxData) {
    setTimeout(() => exportTaxDataToCSV(data.taxData, `${prefix}_税務データ.csv`), 400);
  }
}

/**
 * 月次データの定期エクスポート用
 */
export function exportMonthlyData(
  year: number, 
  month: number,
  transactions: TransactionData[],
  format: 'csv' | 'xlsx' = 'csv'
): void {
  
  const monthString = String(month).padStart(2, '0');
  const filename = `月次データ_${year}年${monthString}月_${getCurrentDateString()}`;

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  if (format === 'csv') {
    exportTransactionsToCSV(monthlyTransactions, `${filename}.csv`);
  } else {
    exportTransactionsToExcel(monthlyTransactions, `${filename}.xlsx`);
  }
}

/**
 * テンプレート用のCSVフォーマット生成
 */
export function generateImportTemplate(type: 'transactions' | 'receipts'): void {
  let headers: string[];
  let sampleData: string[][];

  if (type === 'transactions') {
    headers = ['日付', '種別', '金額', '説明', 'カテゴリ名', '事業用', '店舗名', '備考'];
    sampleData = [
      ['2024-01-15', '支出', '1500', 'コーヒー代', '会議費', '事業用', 'スターバックス', ''],
      ['2024-01-16', '収入', '50000', '業務委託料', '', '事業用', 'ABC会社', ''],
      ['2024-01-17', '支出', '2000', 'ランチ', '食費', '個人用', '', '']
    ];
  } else {
    headers = ['日付', '金額', '説明', '店舗名', 'カテゴリ名', '事業用', '備考'];
    sampleData = [
      ['2024-01-15', '1500', 'コーヒー代', 'スターバックス', '会議費', '事業用', ''],
      ['2024-01-16', '800', 'ランチ', 'サブウェイ', '食費', '個人用', ''],
      ['2024-01-17', '3000', '文房具', 'コクヨ', '消耗品費', '事業用', '']
    ];
  }

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.map(cell => 
      cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });

  downloadFile(blob, `インポートテンプレート_${type}_${getCurrentDateString()}.csv`);
}

/**
 * ファイルダウンロード処理
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 現在日時文字列の取得
 */
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * データフィルタリング機能
 */
export function filterTransactions(
  transactions: TransactionData[],
  options: ExportOptions
): TransactionData[] {
  
  let filtered = [...transactions];

  // 日付範囲フィルタ
  if (options.dateRange) {
    const startDate = new Date(options.dateRange.start);
    const endDate = new Date(options.dateRange.end);
    filtered = filtered.filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= endDate;
    });
  }

  // 事業用/個人用フィルタ
  if (options.includeBusiness === false) {
    filtered = filtered.filter(t => !t.isBusiness);
  }
  if (options.includePersonal === false) {
    filtered = filtered.filter(t => t.isBusiness);
  }

  // カテゴリフィルタ
  if (options.categories && options.categories.length > 0) {
    filtered = filtered.filter(t => 
      t.category && options.categories!.includes(t.category)
    );
  }

  return filtered;
}

/**
 * エクスポート統計情報の取得
 */
export function getExportStats(transactions: TransactionData[]): {
  totalCount: number;
  incomeCount: number;
  expenseCount: number;
  businessCount: number;
  personalCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  totalAmount: {
    income: number;
    expense: number;
  };
} {
  const dates = transactions.map(t => new Date(t.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  return {
    totalCount: transactions.length,
    incomeCount: transactions.filter(t => t.type === 'income').length,
    expenseCount: transactions.filter(t => t.type === 'expense').length,
    businessCount: transactions.filter(t => t.isBusiness).length,
    personalCount: transactions.filter(t => !t.isBusiness).length,
    dateRange: {
      start: minDate.toISOString().split('T')[0],
      end: maxDate.toISOString().split('T')[0]
    },
    totalAmount: {
      income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      expense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    }
  };
}