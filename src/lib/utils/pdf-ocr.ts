import { PDFTransactionData } from './pdf-parser';

// pdf2picのdynamic import
const loadPdf2pic = async () => {
  const pdf2pic = await import('pdf2pic');
  return pdf2pic.default;
};

interface OCRResult {
  text: string;
  confidence: number;
}

interface PDFOCRResult {
  transactions: PDFTransactionData[];
  extractedText: string;
  confidence: number;
  errors: string[];
}

// Google Vision API用のOCR関数
async function performVisionAPIJapanese(imageBase64: string): Promise<OCRResult> {
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ],
            imageContext: {
              languageHints: ['ja', 'en']
            }
          }
        ]
      })
    });

    const result = await response.json();
    
    if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
      const detectedText = result.responses[0].textAnnotations[0];
      return {
        text: detectedText.description || '',
        confidence: 0.8 // Vision APIの場合は固定値
      };
    }
    
    return { text: '', confidence: 0 };
  } catch (error) {
    console.error('Vision API OCRエラー:', error);
    return { text: '', confidence: 0 };
  }
}

// Tesseract.js（フォールバック）
async function performTesseractOCR(imageBase64: string): Promise<OCRResult> {
  try {
    // Tesseract.jsをdynamic importで読み込み（サーバーサイドでの使用）
    const Tesseract = await import('tesseract.js');
    
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    const { data: { text, confidence } } = await Tesseract.recognize(imageBuffer, 'jpn+eng', {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR進行状況: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    return {
      text: text || '',
      confidence: confidence / 100 || 0
    };
  } catch (error) {
    console.error('Tesseract OCRエラー:', error);
    return { text: '', confidence: 0 };
  }
}

// PDFページを画像に変換
export async function convertPDFToImages(pdfBuffer: Buffer): Promise<string[]> {
  try {
    const pdf2pic = await loadPdf2pic();
    
    const convertOptions = {
      density: 200, // DPI
      saveFilename: "page",
      savePath: "/tmp",
      format: "png",
      width: 2000,
      height: 2000
    };
    
    const convert2pic = pdf2pic(pdfBuffer, convertOptions);
    const pages = await convert2pic.bulk(-1, { responseType: "base64" });
    
    return pages.map((page: any) => page.base64);
  } catch (error) {
    console.error('PDF→画像変換エラー:', error);
    throw new Error(`PDF画像変換エラー: ${error}`);
  }
}

// OCRを使用してPDFから取引データを抽出
export async function extractTransactionsFromImagePDF(pdfBuffer: Buffer): Promise<PDFOCRResult> {
  try {
    // PDFを画像に変換
    const pageImages = await convertPDFToImages(pdfBuffer);
    
    if (pageImages.length === 0) {
      return {
        transactions: [],
        extractedText: '',
        confidence: 0,
        errors: ['PDF画像変換に失敗しました']
      };
    }
    
    let allText = '';
    let totalConfidence = 0;
    const errors: string[] = [];
    
    // 各ページをOCR処理
    for (let i = 0; i < pageImages.length; i++) {
      try {
        // まずGoogle Vision APIを試す
        let ocrResult: OCRResult;
        
        if (process.env.GOOGLE_CLOUD_API_KEY) {
          ocrResult = await performVisionAPIJapanese(pageImages[i]);
        } else {
          // Vision APIが利用できない場合はTesseractを使用
          ocrResult = await performTesseractOCR(pageImages[i]);
        }
        
        if (ocrResult.text && ocrResult.text.length > 10) {
          allText += `\n--- ページ ${i + 1} ---\n${ocrResult.text}\n`;
          totalConfidence += ocrResult.confidence;
        } else {
          errors.push(`ページ ${i + 1}: テキスト抽出に失敗`);
        }
      } catch (error) {
        errors.push(`ページ ${i + 1}: OCR処理エラー - ${error}`);
      }
    }
    
    const avgConfidence = pageImages.length > 0 ? totalConfidence / pageImages.length : 0;
    
    if (!allText.trim()) {
      return {
        transactions: [],
        extractedText: '',
        confidence: 0,
        errors: ['全ページでテキスト抽出に失敗しました']
      };
    }
    
    // 抽出したテキストから取引データを解析
    const transactions = extractTransactionsFromOCRText(allText);
    
    return {
      transactions,
      extractedText: allText,
      confidence: avgConfidence,
      errors
    };
    
  } catch (error) {
    return {
      transactions: [],
      extractedText: '',
      confidence: 0,
      errors: [`OCR処理エラー: ${error}`]
    };
  }
}

// OCRテキストから取引データを抽出
function extractTransactionsFromOCRText(text: string): PDFTransactionData[] {
  const transactions: PDFTransactionData[] = [];
  const lines = text.split('\n').filter(line => line.trim().length > 5);
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // OCRでは文字認識エラーがあるため、より柔軟なパターンマッチング
    
    // 日付パターン（OCR誤認識を考慮）
    const datePatterns = [
      /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})[日]?/,    // 2024/1/15, 2024-1-15, 2024年1月15日
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,             // 1/15/2024
      /(\d{1,2})[\/\-月](\d{1,2})[日]?/,                   // 1/15, 1月15日
    ];
    
    // 金額パターン（OCR誤認識を考慮）
    const amountPatterns = [
      /[¥￥]?([0-9,]+)[円]?/g,
      /([0-9,]+)[円]/g,
      /\-([0-9,]+)/g,
      /△([0-9,]+)/g
    ];
    
    let foundDate = '';
    let foundAmount = 0;
    let description = trimmedLine;
    
    // 日付を検索
    for (const pattern of datePatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        foundDate = match[0];
        description = description.replace(match[0], '').trim();
        
        // 標準形式に変換
        const currentYear = new Date().getFullYear();
        if (match[1] && match[2] && match[3]) {
          if (match[1].length === 4) {
            foundDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          } else {
            foundDate = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
          }
        } else if (match[1] && match[2]) {
          foundDate = `${currentYear}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        }
        break;
      }
    }
    
    // 金額を検索
    const amounts: number[] = [];
    for (const pattern of amountPatterns) {
      let match;
      while ((match = pattern.exec(trimmedLine)) !== null) {
        const amountStr = match[1] || match[0];
        const cleanAmount = amountStr.replace(/[,¥￥円]/g, '');
        const amount = parseInt(cleanAmount, 10);
        
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount);
          description = description.replace(match[0], '').trim();
        }
      }
    }
    
    // 取引データとして有効かチェック
    if (foundDate && amounts.length > 0 && description.length > 2) {
      // 最も大きな金額を採用（通常は取引金額）
      foundAmount = Math.max(...amounts);
      
      // 明らかにヘッダーやフッターでない場合のみ追加
      if (!description.includes('明細') && 
          !description.includes('合計') &&
          !description.includes('小計') &&
          !description.includes('ページ') &&
          description.length < 100) {
        
        transactions.push({
          date: foundDate,
          amount: foundAmount,
          description: description || '不明な取引',
          originalData: { 
            format: 'PDF-OCR',
            line: trimmedLine,
            confidence: 'low' // OCRは精度が低いことを示す
          }
        });
      }
    }
  }
  
  return transactions;
}

// OCR結果の後処理・修正
export function postProcessOCRTransactions(transactions: PDFTransactionData[]): PDFTransactionData[] {
  return transactions.map(transaction => {
    let { description, amount } = transaction;
    
    // よくあるOCR誤認識の修正
    description = description
      .replace(/[０-９]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFEE0)) // 全角数字を半角に
      .replace(/コンヒ゛ニ/g, 'コンビニ')
      .replace(/スーハー/g, 'スーパー')
      .replace(/レストラン/g, 'レストラン')
      .replace(/カフェ/g, 'カフェ')
      .replace(/O/g, '0') // アルファベットのOを数字の0に
      .replace(/I/g, '1') // アルファベットのIを数字の1に
      .trim();
    
    // 金額の妥当性チェック
    if (amount < 0) {
      amount = Math.abs(amount);
    }
    
    // 異常に大きな金額（1000万円以上）は除外
    if (amount > 10000000) {
      amount = Math.floor(amount / 100); // 100で割って桁数を修正
    }
    
    return {
      ...transaction,
      description,
      amount
    };
  }).filter(transaction => 
    transaction.amount > 0 && 
    transaction.amount < 10000000 &&
    transaction.description.length > 1
  );
}