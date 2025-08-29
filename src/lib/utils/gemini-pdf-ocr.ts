// GeminiAPIを使った画像ベースPDF処理
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFTransactionData, PDFParseResult } from './pdf-parser';

// Gemini API設定
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY環境変数が設定されていません');
}

// PDFを画像に変換する関数（改良版 - GraphicsMagick不要）
async function convertPDFToImages(pdfBuffer: Buffer): Promise<string[]> {
  try {
    console.log('PDF→画像変換を試行中...');
    
    // Method 1: pdf2picを試行
    try {
      const pdf2pic = await import('pdf2pic');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempPdfPath = path.join(tempDir, `temp-pdf-${Date.now()}.pdf`);
      
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      
      const convert = pdf2pic.fromPath(tempPdfPath, {
        density: 200,           
        saveFilename: "page",
        savePath: tempDir,
        format: "png",
        width: 1500,
        height: 1500
      });
      
      const imagePaths: string[] = [];
      const maxPages = 3; // ページ数を制限
      
      for (let page = 1; page <= maxPages; page++) {
        try {
          const result = await convert(page, false);
          if (result?.path) {
            imagePaths.push(result.path);
            console.log(`ページ ${page} 変換成功: ${result.path}`);
          } else {
            break;
          }
        } catch (pageError) {
          console.log(`ページ ${page} 変換失敗:`, pageError);
          break;
        }
      }
      
      // 一時PDFファイルを削除
      fs.unlinkSync(tempPdfPath);
      
      if (imagePaths.length > 0) {
        console.log(`pdf2pic成功: ${imagePaths.length}ページ変換完了`);
        return imagePaths;
      }
      
    } catch (pdf2picError) {
      console.log('pdf2pic変換失敗:', pdf2picError);
    }
    
    // Method 2: PDFを直接GeminiAPIに送信（フォールバック）
    console.log('フォールバック: PDFを直接GeminiAPIに送信');
    
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp-pdf-direct-${Date.now()}.pdf`);
    
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    return [tempPdfPath]; // PDFファイルパスを返す（画像の代わり）
    
  } catch (error) {
    console.error('PDF変換完全失敗:', error);
    throw new Error(`PDF変換エラー: GraphicsMagick/ImageMagickまたはPDFライブラリの問題`);
  }
}

// 画像ファイルをBase64に変換
async function imageToBase64(imagePath: string): Promise<string> {
  try {
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Image to base64 conversion failed:', error);
    throw new Error(`画像変換エラー: ${error}`);
  }
}

// GeminiAPIでOCR処理
export async function extractTextFromPDFWithGemini(pdfBuffer: Buffer): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY または NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set');
  }
  
  try {
    console.log('GeminiAPI OCR処理開始...');
    
    // PDFを画像に変換
    const imagePaths = await convertPDFToImages(pdfBuffer);
    console.log(`PDF変換完了: ${imagePaths.length}ページ`);
    
    if (imagePaths.length === 0) {
      throw new Error('PDFから画像を抽出できませんでした');
    }
    
    // Gemini AI初期化
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    let extractedText = '';
    const fs = await import('fs');
    
    // 各ページ（画像またはPDF）を処理
    for (let i = 0; i < imagePaths.length; i++) {
      const filePath = imagePaths[i];
      
      try {
        console.log(`ページ ${i + 1}/${imagePaths.length} を処理中...`);
        
        let base64Data: string;
        let mimeType: string;
        
        // ファイル形式を判定
        if (filePath.endsWith('.pdf')) {
          // PDFを直接処理
          const pdfBuffer = fs.readFileSync(filePath);
          base64Data = pdfBuffer.toString('base64');
          mimeType = 'application/pdf';
          console.log('PDFを直接GeminiAPIに送信中...');
        } else {
          // 画像ファイル処理
          base64Data = await imageToBase64(filePath);
          mimeType = 'image/png';
          console.log('画像をGeminiAPIに送信中...');
        }
        
        // Gemini APIに送信
        const prompt = `
この${mimeType === 'application/pdf' ? 'PDFファイル' : '画像'}は楽天カードの利用明細です。以下の情報を正確に抽出してください：

1. 利用日（MM/DD形式）
2. 利用店名・商品名  
3. 利用金額（数値のみ、円は不要）

出力形式：
利用日 | 利用店名 | 金額
01/15 | コンビニエンスストア | 1500
01/16 | レストラン田中 | 3200

明細データが見つからない場合は「明細データなし」と出力してください。
ヘッダー情報や合計金額は除外してください。
日本語で出力してください。
`;
        
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]);
        
        const response = await result.response;
        const pageText = response.text();
        
        if (pageText && !pageText.includes('明細データなし')) {
          extractedText += `\n=== ページ ${i + 1} ===\n${pageText}\n`;
        }
        
        console.log(`ページ ${i + 1} OCR完了: ${pageText.length}文字`);
        console.log('抽出結果サンプル:', pageText.substring(0, 200));
        
        // 一時ファイルを削除
        fs.unlinkSync(filePath);
        
      } catch (pageError) {
        console.error(`ページ ${i + 1} の処理でエラー:`, pageError);
        // 一時ファイルを削除
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }
    
    console.log('GeminiAPI OCR処理完了');
    console.log('抽出されたテキスト長:', extractedText.length);
    
    return extractedText.trim();
    
  } catch (error) {
    console.error('GeminiAPI OCR処理エラー:', error);
    throw new Error(`GeminiAPI処理失敗: ${error}`);
  }
}

// Gemini OCR結果から取引データを抽出
export function parseGeminiOCRResult(text: string): PDFTransactionData[] {
  const transactions: PDFTransactionData[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  const currentYear = new Date().getFullYear();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // ヘッダー行やページ区切りをスキップ
    if (trimmedLine.includes('===') || 
        trimmedLine.includes('利用日') || 
        trimmedLine.includes('|') && trimmedLine.split('|').length < 3) {
      continue;
    }
    
    // パイプ区切り形式の解析
    const pipeMatch = trimmedLine.match(/(\d{1,2}\/\d{1,2})\s*\|\s*(.+?)\s*\|\s*(\d+)/);
    
    if (pipeMatch) {
      const [, date, description, amount] = pipeMatch;
      
      transactions.push({
        date: `${currentYear}-${date.replace('/', '-').padStart(5, '0')}`,
        amount: -parseInt(amount), // クレジットカードは支出
        description: description.trim(),
        originalData: { 
          format: '楽天カード明細PDF (Gemini OCR)', 
          line: trimmedLine 
        }
      });
    } else {
      // スペース区切り形式も試行
      const spaceMatch = trimmedLine.match(/(\d{1,2}\/\d{1,2})\s+(.+?)\s+(\d+)$/);
      
      if (spaceMatch) {
        const [, date, description, amount] = spaceMatch;
        
        transactions.push({
          date: `${currentYear}-${date.replace('/', '-').padStart(5, '0')}`,
          amount: -parseInt(amount),
          description: description.trim(),
          originalData: { 
            format: '楽天カード明細PDF (Gemini OCR)', 
            line: trimmedLine 
          }
        });
      }
    }
  }
  
  console.log(`Gemini OCR結果から ${transactions.length} 件の取引を抽出`);
  
  return transactions;
}

// GeminiAPIを使った完全なPDF処理
export async function parsePDFWithGemini(pdfBuffer: Buffer): Promise<PDFParseResult> {
  try {
    console.log('GeminiAPI PDF処理開始');
    
    // Gemini OCR実行
    const ocrText = await extractTextFromPDFWithGemini(pdfBuffer);
    
    if (!ocrText || ocrText.length < 10) {
      return {
        transactions: [],
        format: 'gemini-ocr-no-data',
        errors: ['GeminiAPIでテキストを抽出できましたが、取引データが見つかりませんでした'],
        isTextBased: false
      };
    }
    
    // OCR結果から取引データを抽出
    const transactions = parseGeminiOCRResult(ocrText);
    
    if (transactions.length === 0) {
      return {
        transactions: [],
        format: 'gemini-ocr-no-transactions',
        errors: [
          'GeminiAPIで画像を読み取りましたが、取引明細を識別できませんでした',
          '楽天カードの利用明細形式でない可能性があります'
        ],
        isTextBased: false
      };
    }
    
    return {
      transactions,
      format: 'gemini-ocr-success',
      errors: [],
      isTextBased: false
    };
    
  } catch (error) {
    console.error('GeminiAPI PDF処理エラー:', error);
    return {
      transactions: [],
      format: 'gemini-ocr-error',
      errors: [
        `GeminiAPI処理エラー: ${error}`,
        'APIキーの設定またはネットワーク接続を確認してください'
      ],
      isTextBased: false
    };
  }
}