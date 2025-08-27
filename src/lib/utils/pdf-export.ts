import jsPDF from 'jspdf';

interface ReportData {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  businessExpenses: number;
  personalExpenses: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  aiClassificationStats: {
    totalClassified: number;
    businessRatio: number;
    topCategories: string[];
  };
}

/**
 * 財務レポートをPDF形式でエクスポート
 */
export function exportReportToPDF(reportData: ReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // 日本語フォントの設定（利用可能であれば）
  let yPos = 20;
  
  // タイトル
  doc.setFontSize(20);
  doc.text('財務レポート', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  doc.setFontSize(14);
  doc.text(`期間: ${reportData.period}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;
  
  // サマリー情報
  doc.setFontSize(16);
  doc.text('財務サマリー', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(12);
  const summaryData = [
    ['総収入', formatCurrency(reportData.totalRevenue)],
    ['総支出', formatCurrency(reportData.totalExpenses)],
    ['純利益', formatCurrency(reportData.netIncome)],
    ['取引件数', `${reportData.transactionCount}件`]
  ];
  
  summaryData.forEach(([label, value]) => {
    doc.text(`${label}:`, 25, yPos);
    doc.text(value, 80, yPos);
    yPos += 8;
  });
  
  yPos += 10;
  
  // 事業用・個人用支出
  doc.setFontSize(16);
  doc.text('支出内訳', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(12);
  const expenseData = [
    ['事業用支出', formatCurrency(reportData.businessExpenses), 
     `${reportData.totalExpenses > 0 ? ((reportData.businessExpenses / reportData.totalExpenses) * 100).toFixed(1) : 0}%`],
    ['個人用支出', formatCurrency(reportData.personalExpenses), 
     `${reportData.totalExpenses > 0 ? ((reportData.personalExpenses / reportData.totalExpenses) * 100).toFixed(1) : 0}%`]
  ];
  
  expenseData.forEach(([label, amount, percentage]) => {
    doc.text(`${label}:`, 25, yPos);
    doc.text(amount, 80, yPos);
    doc.text(`(${percentage})`, 130, yPos);
    yPos += 8;
  });
  
  yPos += 10;
  
  // AI分類統計
  doc.setFontSize(16);
  doc.text('AI分類統計', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(12);
  const aiStats = [
    ['AI分類件数', `${reportData.aiClassificationStats.totalClassified}件`],
    ['事業用比率', `${reportData.aiClassificationStats.businessRatio.toFixed(1)}%`],
    ['主要カテゴリ', reportData.aiClassificationStats.topCategories.slice(0, 3).join(', ')]
  ];
  
  aiStats.forEach(([label, value]) => {
    doc.text(`${label}:`, 25, yPos);
    doc.text(value, 80, yPos);
    yPos += 8;
  });
  
  // 改ページが必要な場合
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 10;
  }
  
  // カテゴリ別内訳
  doc.setFontSize(16);
  doc.text('カテゴリ別支出内訳', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  
  // テーブルヘッダー
  const headerY = yPos;
  doc.setFontSize(10);
  doc.text('順位', 25, headerY);
  doc.text('カテゴリ', 45, headerY);
  doc.text('金額', 120, headerY);
  doc.text('割合', 160, headerY);
  yPos += 8;
  
  // 区切り線
  doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);
  
  // カテゴリデータ
  reportData.categoryBreakdown.forEach((item, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
      // ヘッダーを再度描画
      doc.text('順位', 25, yPos);
      doc.text('カテゴリ', 45, yPos);
      doc.text('金額', 120, yPos);
      doc.text('割合', 160, yPos);
      yPos += 8;
      doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);
    }
    
    doc.text(`${index + 1}`, 25, yPos);
    doc.text(item.category, 45, yPos);
    doc.text(formatCurrency(item.amount), 120, yPos);
    doc.text(`${item.percentage.toFixed(1)}%`, 160, yPos);
    yPos += 7;
  });
  
  // フッター
  const pageCount = doc.internal.pages.length;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('ja-JP')} - Page ${i} of ${pageCount}`, 
      pageWidth / 2, 
      doc.internal.pageSize.height - 10, 
      { align: 'center' }
    );
  }
  
  // PDFダウンロード
  const filename = `財務レポート_${reportData.period}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * 通貨フォーマット
 */
function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

/**
 * カテゴリ別詳細レポートのPDF生成
 */
export function exportCategoryDetailToPDF(
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>,
  period: string,
  totalExpenses: number
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;
  
  // タイトル
  doc.setFontSize(18);
  doc.text('カテゴリ別支出詳細レポート', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  doc.setFontSize(12);
  doc.text(`期間: ${period}`, pageWidth / 2, yPos, { align: 'center' });
  doc.text(`総支出: ${formatCurrency(totalExpenses)}`, pageWidth / 2, yPos + 8, { align: 'center' });
  yPos += 25;
  
  // テーブルヘッダー
  doc.setFontSize(12);
  doc.text('順位', 25, yPos);
  doc.text('カテゴリ名', 50, yPos);
  doc.text('金額', 120, yPos);
  doc.text('割合', 160, yPos);
  yPos += 8;
  
  // 区切り線
  doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);
  
  // データ行
  categoryBreakdown.forEach((item, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 30;
      // ヘッダー再描画
      doc.text('順位', 25, yPos);
      doc.text('カテゴリ名', 50, yPos);
      doc.text('金額', 120, yPos);
      doc.text('割合', 160, yPos);
      yPos += 8;
      doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);
    }
    
    doc.text(`${index + 1}`, 25, yPos);
    doc.text(item.category, 50, yPos);
    doc.text(formatCurrency(item.amount), 120, yPos);
    doc.text(`${item.percentage.toFixed(1)}%`, 160, yPos);
    
    // プログレスバー風の表現
    const barWidth = (item.percentage / 100) * 50;
    doc.setFillColor(66, 135, 245); // 青色
    doc.rect(50, yPos + 2, barWidth, 2, 'F');
    
    yPos += 12;
  });
  
  // フッター
  const pageCount = doc.internal.pages.length;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('ja-JP')} - Page ${i} of ${pageCount}`, 
      pageWidth / 2, 
      doc.internal.pageSize.height - 10, 
      { align: 'center' }
    );
  }
  
  const filename = `カテゴリ別詳細_${period}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}