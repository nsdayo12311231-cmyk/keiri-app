// pdf2jsonを使った代替PDF処理
import { PDFTransactionData, PDFParseResult } from './pdf-parser';

// pdf2jsonのdynamic import
const loadPdf2Json = async () => {
  const PDFParser = await import('pdf2json');
  return PDFParser.default;
};

// PDF2Jsonから取引データを抽出
export async function extractTextFromPDFv2(pdfBuffer: Buffer): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('pdf2jsonライブラリを使用してPDF解析中...');
      
      const PDFParser = await loadPdf2Json();
      const pdfParser = new PDFParser();
      
      // パーサーのイベントリスナーを設定
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error('PDF解析エラー:', errData);
        reject(new Error(`PDF解析エラー: ${errData.parserError}`));
      });
      
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          console.log('PDF解析完了 - ページ数:', pdfData.Meta?.Pages || 0);
          
          let extractedText = '';
          
          // 各ページのテキストを抽出
          if (pdfData.formImage && pdfData.formImage.Pages) {
            for (const page of pdfData.formImage.Pages) {
              if (page.Texts) {
                for (const textItem of page.Texts) {
                  if (textItem.R) {
                    for (const run of textItem.R) {
                      if (run.T) {
                        // URLデコードされたテキスト
                        const decodedText = decodeURIComponent(run.T);
                        extractedText += decodedText + ' ';
                      }
                    }
                  }
                }
                extractedText += '\n';
              }
            }
          }
          
          console.log('抽出されたテキスト長:', extractedText.length);
          console.log('テキストサンプル:', extractedText.substring(0, 200));
          
          resolve(extractedText.trim());
        } catch (processError) {
          console.error('テキスト処理エラー:', processError);
          reject(new Error(`テキスト処理エラー: ${processError}`));
        }
      });
      
      // PDFを解析開始
      pdfParser.parseBuffer(pdfBuffer);
      
    } catch (error) {
      console.error('pdf2json初期化エラー:', error);
      reject(new Error(`pdf2json初期化エラー: ${error}`));
    }
  });
}

// PDFv2を使った全体処理
export async function parsePDFv2(pdfBuffer: Buffer): Promise<PDFParseResult> {
  try {
    console.log('PDFv2解析開始 - ファイルサイズ:', pdfBuffer.length, 'bytes');
    
    // pdf2jsonでテキスト抽出
    const text = await extractTextFromPDFv2(pdfBuffer);
    
    if (!text || text.trim().length < 10) {
      return {
        transactions: [],
        format: 'image-pdf',
        errors: ['PDFからテキストを抽出できませんでした。画像ベースのPDFの可能性があります。'],
        isTextBased: false
      };
    }
    
    // 既存のパターンマッチング処理を使用
    const { parsePDFText } = await import('./pdf-parser');
    return parsePDFText(text);
    
  } catch (error) {
    console.error('PDFv2処理エラー:', error);
    return {
      transactions: [],
      format: 'error',
      errors: [`PDFv2処理エラー: ${error}`],
      isTextBased: false
    };
  }
}

// 楽天カード明細PDF専用の処理（pdf2jsonベース）
export function extractRakutenTransactionsFromPDF2JsonText(text: string): PDFTransactionData[] {
  const transactions: PDFTransactionData[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let inTransactionSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 楽天カード明細の取引セクション検出
    if (line.includes('ご利用日') && line.includes('ご利用店名')) {
      inTransactionSection = true;
      continue;
    }
    
    // 取引セクション終了検出
    if (inTransactionSection && (line.includes('合計') || line.includes('お支払い'))) {
      break;
    }
    
    if (inTransactionSection && line.length > 10) {
      // 楽天カード形式のパターンマッチング
      // 例: "01/15 コンビニエンスストア 1,500"
      const rakutenMatch = line.match(/(\d{1,2}\/\d{1,2})\s+(.+?)\s+([,\d]+)/);
      
      if (rakutenMatch) {
        const [, date, description, amount] = rakutenMatch;
        
        // 年を補完（現在年または前年を使用）
        const currentYear = new Date().getFullYear();
        const fullDate = `${currentYear}-${date.replace('/', '-').padStart(5, '0')}`;
        
        transactions.push({
          date: fullDate,
          amount: -parseInt(amount.replace(/,/g, '')), // クレジットカードは支出
          description: description.trim(),
          originalData: { format: '楽天カード明細PDF (pdf2json)', line }
        });
      }
    }
  }
  
  return transactions;
}