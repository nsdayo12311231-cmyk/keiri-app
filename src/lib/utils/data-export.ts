/**
 * データエクスポート機能（クロスプラットフォーム対応版）
 * CSV、Excel（XLSX）形式での取引データ、レシート、レポートの出力
 * PC・スマホ・タブレット環境での互換性を保証
 */

import { universalDownload, detectPlatform, preflightCheck, batchDownload } from './universal-download';
import { downloadForIOSSafari, detectiOSEnvironment, downloadFileOnIOS } from './ios-download-fix';
export interface TransactionData {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId?: string;
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
 * 取引データをCSV形式でエクスポート（クロスプラットフォーム対応）
 */
export async function exportTransactionsToCSV(
  transactions: TransactionData[],
  filename?: string,
  onSuccess?: (title: string, message: string) => void
): Promise<void> {
  try {
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
        transaction.categoryId || '',
        `"${(transaction.categoryName || '').replace(/"/g, '""')}"`,
        transaction.isBusiness ? '事業用' : '個人用',
        `"${(transaction.merchantName || '').replace(/"/g, '""')}"`,
        transaction.receiptUrl || '',
        `"${(transaction.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    // iOS Safari専用の処理を優先
    const platform = detectPlatform();
    if (platform.type === 'ios' && platform.browser === 'safari') {
      const result = await downloadFileOnIOS(
        csvContent,
        filename || `取引データ_${getCurrentDateString()}.csv`,
        'text/csv;charset=utf-8'
      );
      
      if (result.success && onSuccess) {
        onSuccess('📱 iPhone: ダウンロード完了', result.message);
      }
      
      if (!result.success) {
        console.warn('iOS Safari ダウンロード失敗、universal-downloadにフォールバック');
        // フォールバック処理
        const fallbackResult = await universalDownload(csvContent, {
          filename: filename || `取引データ_${getCurrentDateString()}.csv`,
          mimeType: 'text/csv;charset=utf-8;',
          showSuccessMessage: false,
          fallbackToNewTab: true
        });
        
        if (!fallbackResult.success) {
          throw new Error(result.message || 'ダウンロードに失敗しました');
        }
      }
      return;
    }

    // その他のプラットフォーム用の通常処理
    const result = await universalDownload(csvContent, {
      filename: filename || `取引データ_${getCurrentDateString()}.csv`,
      mimeType: 'text/csv;charset=utf-8;',
      showSuccessMessage: false,
      fallbackToNewTab: true
    });

    if (result.success && onSuccess) {
      const { title, message } = getSaveLocationMessage(result.platform, filename || `取引データ_${getCurrentDateString()}.csv`);
      onSuccess(title, message);
    }

    if (!result.success) {
      throw new Error(result.error || 'ダウンロードに失敗しました');
    }
  } catch (error) {
    console.error('CSV エクスポートエラー:', error);
    throw error;
  }
}

/**
 * 取引データをExcel形式でエクスポート（クロスプラットフォーム対応）
 * クライアントサイドでExcelファイルを生成
 */
export async function exportTransactionsToExcel(
  transactions: TransactionData[],
  filename?: string
): Promise<void> {
  try {
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
      tableHTML += `<td>${transaction.categoryId || ''}</td>`;
      tableHTML += `<td>${transaction.categoryName || ''}</td>`;
      tableHTML += `<td>${transaction.isBusiness ? '事業用' : '個人用'}</td>`;
      tableHTML += `<td>${transaction.merchantName || ''}</td>`;
      tableHTML += `<td>${transaction.receiptUrl || ''}</td>`;
      tableHTML += `<td>${transaction.notes || ''}</td>`;
      tableHTML += '</tr>';
    });
    
    tableHTML += '</table>';

    // iOS Safari専用の処理を優先
    const platform = detectPlatform();
    if (platform.type === 'ios' && platform.browser === 'safari') {
      const result = await downloadFileOnIOS(
        tableHTML,
        filename || `取引データ_${getCurrentDateString()}.xlsx`,
        'application/vnd.ms-excel'
      );
      
      if (!result.success) {
        console.warn('iOS Safari Excel ダウンロード失敗、universal-downloadにフォールバック');
        // フォールバック処理
        const fallbackResult = await universalDownload(tableHTML, {
          filename: filename || `取引データ_${getCurrentDateString()}.xlsx`,
          mimeType: 'application/vnd.ms-excel',
          showSuccessMessage: true,
          fallbackToNewTab: true
        });
        
        if (!fallbackResult.success) {
          throw new Error(result.message || 'Excel エクスポートに失敗しました');
        }
      }
      return;
    }

    // その他のプラットフォーム用の通常処理
    const result = await universalDownload(tableHTML, {
      filename: filename || `取引データ_${getCurrentDateString()}.xlsx`,
      mimeType: 'application/vnd.ms-excel',
      showSuccessMessage: true,
      fallbackToNewTab: true
    });

    if (!result.success) {
      throw new Error(result.error || 'Excel エクスポートに失敗しました');
    }
  } catch (error) {
    console.error('Excel エクスポートエラー:', error);
    throw error;
  }
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
}, filename?: string, onSuccess?: (title: string, message: string) => void): void {
  
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

  // iOS Safari専用の処理を優先
  const platform = detectPlatform();
  if (platform.type === 'ios' && platform.browser === 'safari') {
    downloadFileOnIOS(
      csvContent,
      filename || `財務レポート_${reportData.period}_${getCurrentDateString()}.csv`,
      'text/csv;charset=utf-8'
    ).then(result => {
      if (result.success && onSuccess) {
        onSuccess('📱 iPhone: レポートダウンロード完了', result.message);
      }
    });
    return;
  }

  // その他のプラットフォーム用の従来処理
  downloadFile(blob, filename || `財務レポート_${reportData.period}_${getCurrentDateString()}.csv`, onSuccess);
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

  // iOS Safari専用の処理を優先
  const platform = detectPlatform();
  if (platform.type === 'ios' && platform.browser === 'safari') {
    downloadFileOnIOS(
      csvContent,
      filename || `税務データ_${taxData.year}_${getCurrentDateString()}.csv`,
      'text/csv;charset=utf-8'
    );
    return;
  }

  // その他のプラットフォーム用の従来処理
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
  categoryId?: string;
  categoryName?: string;
  isBusiness: boolean;
  imageUrl?: string;
  ocrText?: string;
  confidence?: number;
}>, filename?: string, onSuccess?: (title: string, message: string) => void): void {

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
      receipt.category || ''
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
  
  // iOS Safari専用の処理を優先
  const platform = detectPlatform();
  if (platform.type === 'ios' && platform.browser === 'safari') {
    downloadFileOnIOS(
      csvContent,
      filename || `レシートデータ_${getCurrentDateString()}.csv`,
      'text/csv;charset=utf-8'
    ).then(result => {
      if (result.success && onSuccess) {
        onSuccess('📱 iPhone: レシートデータダウンロード完了', result.message);
      }
    });
    return;
  }

  // その他のプラットフォーム用の従来処理
  downloadFile(blob, filename || `レシートデータ_${getCurrentDateString()}.csv`, onSuccess);
}

/**
 * 複数形式での一括エクスポート（クロスプラットフォーム対応）
 */
export async function exportAllData(data: {
  transactions: TransactionData[];
  receipts: Array<any>;
  reportData: any;
  taxData?: any;
}): Promise<void> {
  try {
    // 日時を含むフォルダ名風のプレフィックス
    const timestamp = getCurrentDateString();
    const prefix = `keiri_export_${timestamp}`;

    // バッチダウンロードを使用してクロスプラットフォーム対応
    const files: Array<{ data: string; filename: string; mimeType?: string }> = [];
    
    // 取引データCSV
    if (data.transactions.length > 0) {
      const csvContent = createTransactionCSV(data.transactions);
      files.push({
        data: csvContent,
        filename: `${prefix}_取引データ.csv`,
        mimeType: 'text/csv;charset=utf-8;'
      });
    }
    
    // レシートデータCSV
    if (data.receipts.length > 0) {
      const receiptCsvContent = createReceiptCSV(data.receipts);
      files.push({
        data: receiptCsvContent,
        filename: `${prefix}_レシート.csv`,
        mimeType: 'text/csv;charset=utf-8;'
      });
    }
    
    // レポートCSV
    if (data.reportData) {
      const reportCsvContent = createReportCSV(data.reportData);
      files.push({
        data: reportCsvContent,
        filename: `${prefix}_レポート.csv`,
        mimeType: 'text/csv;charset=utf-8;'
      });
    }
    
    // 税務データCSV
    if (data.taxData) {
      const taxCsvContent = createTaxDataCSV(data.taxData);
      files.push({
        data: taxCsvContent,
        filename: `${prefix}_税務データ.csv`,
        mimeType: 'text/csv;charset=utf-8;'
      });
    }

    // iOS Safari専用の処理を優先
    const platform = detectPlatform();
    if (platform.type === 'ios' && platform.browser === 'safari') {
      console.log('🍎 iOS Safari用の一括ダウンロード開始');
      
      // iOS専用の個別ダウンロード（間隔を空けて）
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📥 ダウンロード中 ${i + 1}/${files.length}: ${file.filename}`);
        
        try {
          const result = await downloadFileOnIOS(
            file.data,
            file.filename,
            file.mimeType || 'text/csv;charset=utf-8'
          );
          
          if (!result.success) {
            console.warn(`⚠️ iOS ダウンロード失敗: ${file.filename}, フォールバック実行`);
            // フォールバックとして universal-download を使用
            await universalDownload(file.data, {
              filename: file.filename,
              mimeType: file.mimeType || 'text/csv;charset=utf-8',
              showSuccessMessage: false,
              fallbackToNewTab: true
            });
          }
          
          // iOS Safari用の長い間隔
          if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
        } catch (error) {
          console.error(`❌ ファイルダウンロード失敗: ${file.filename}`, error);
        }
      }
    } else {
      // その他のプラットフォーム用のバッチダウンロード
      await batchDownload(files, {
        interval: 800,
        onProgress: (index, total, filename) => {
          console.log(`📥 ダウンロード中 ${index}/${total}: ${filename}`);
        },
        onError: (index, filename, error) => {
          console.error(`❌ ファイルダウンロード失敗: ${filename}`, error);
        }
      });
    }

    console.log(`✅ 一括エクスポート完了: ${files.length}ファイル`);
  } catch (error) {
    console.error('一括エクスポートエラー:', error);
    throw error;
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

  // iOS Safari専用の処理を優先
  const platform = detectPlatform();
  const templateFilename = `インポートテンプレート_${type}_${getCurrentDateString()}.csv`;
  
  if (platform.type === 'ios' && platform.browser === 'safari') {
    downloadFileOnIOS(
      csvContent,
      templateFilename,
      'text/csv;charset=utf-8'
    );
    return;
  }

  // その他のプラットフォーム用の従来処理
  downloadFile(blob, templateFilename);
}

/**
 * デバイス種別の検出
 */
function detectDevice(): 'ios' | 'android' | 'desktop' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  } else if (/android/.test(userAgent)) {
    return 'android';
  } else {
    return 'desktop';
  }
}

/**
 * 保存先案内メッセージの生成（新しいプラットフォーム情報対応）
 */
export function getSaveLocationMessage(platform: any, filename: string): { title: string; message: string } {
  const platformType = platform?.type || detectDevice();
  
  switch (platformType) {
    case 'ios':
      return {
        title: 'ファイルをダウンロードしました',
        message: `📱 iPhone/iPad での保存先:
• 「ファイル」アプリ → 「ダウンロード」フォルダ
• Safari: 画面下のダウンロードボタン（↓）をタップ
• Chrome: メニュー → 「ダウンロード」

ファイル名: ${filename}`
      };
      
    case 'android':
      return {
        title: 'ファイルをダウンロードしました',
        message: `📱 Android での保存先:
• 「ファイル」または「Files」アプリ → 「Download」フォルダ  
• 通知パネルからダウンロード完了通知をタップ
• ブラウザのメニュー → 「ダウンロード」

ファイル名: ${filename}`
      };
      
    default:
      return {
        title: 'ファイルをダウンロードしました', 
        message: `💻 デスクトップでの保存先:
• ダウンロードフォルダ
• ブラウザで設定した保存先

ファイル名: ${filename}`
      };
  }
}

/**
 * CSV コンテンツ生成補助関数群
 */
function createTransactionCSV(transactions: TransactionData[]): string {
  const headers = ['日付', '種別', '金額', '説明', 'カテゴリID', 'カテゴリ名', '事業用', '店舗名', 'レシートURL', '備考'];
  
  const csvContent = [
    headers.join(','),
    ...transactions.map(transaction => [
      transaction.date,
      transaction.type === 'income' ? '収入' : '支出',
      transaction.amount.toString(),
      `"${(transaction.description || '').replace(/"/g, '""')}"`,
      transaction.categoryId || '',
      `"${(transaction.categoryName || '').replace(/"/g, '""')}"`,
      transaction.isBusiness ? '事業用' : '個人用',
      `"${(transaction.merchantName || '').replace(/"/g, '""')}"`,
      transaction.receiptUrl || '',
      `"${(transaction.notes || '').replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');
  
  return '\uFEFF' + csvContent; // UTF-8 BOM
}

function createReceiptCSV(receipts: Array<any>): string {
  const headers = ['日付', '金額', '説明', '店舗名', 'カテゴリID', 'カテゴリ名', '事業用', 'レシート画像URL', 'OCRテキスト', 'AI信頼度'];
  
  const csvContent = [
    headers.join(','),
    ...receipts.map(receipt => [
      receipt.date || receipt.created_at?.split('T')[0] || '',
      (receipt.amount || 0).toString(),
      `"${(receipt.description || '').replace(/"/g, '""')}"`,
      `"${(receipt.merchantName || receipt.merchant_name || '').replace(/"/g, '""')}"`,
      receipt.categoryId || receipt.category_id || '',
      `"${(receipt.categoryName || receipt.description || '').replace(/"/g, '""')}"`,
      receipt.isBusiness || receipt.is_business ? '事業用' : '個人用',
      receipt.imageUrl || receipt.image_url || '',
      `"${(receipt.ocrText || receipt.ocr_text || '').replace(/"/g, '""').substring(0, 100)}"`,
      receipt.confidence || receipt.ai_confidence ? (receipt.confidence || receipt.ai_confidence).toFixed(2) : ''
    ].join(','))
  ].join('\n');
  
  return '\uFEFF' + csvContent;
}

function createReportCSV(reportData: any): string {
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
    ...(reportData.categoryBreakdown || []).map((item: any) => 
      `"${item.category}",${item.amount},${item.percentage?.toFixed(1) || '0.0'}`
    )
  ];
  
  return '\uFEFF' + csvLines.join('\n');
}

function createTaxDataCSV(taxData: any): string {
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
  ];
  
  return '\uFEFF' + csvLines.join('\n');
}

/**
 * ファイルダウンロード処理
 */
function downloadFile(blob: Blob, filename: string, onSuccess?: (title: string, message: string) => void): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  // 成功コールバックを実行
  if (onSuccess) {
    const { title, message } = getSaveLocationMessage(filename);
    setTimeout(() => {
      onSuccess(title, message);
    }, 300);
  }
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
      t.categoryId && options.categories!.includes(t.categoryId)
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