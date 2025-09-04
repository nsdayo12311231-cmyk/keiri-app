// OCRテスト用スクリプト
const fs = require('fs');

console.log('=== OCR処理テスト ===');

async function testTesseract() {
  try {
    console.log('Tesseract.jsテスト開始...');
    
    // PDF2PICでPDFを画像に変換
    const pdf2pic = require('pdf2pic');
    const pdfPath = process.env.HOME + '/Downloads/statement_202508.pdf';
    
    console.log('PDFを画像に変換中...');
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 200,           // 解像度
      saveFilename: "page",
      savePath: "./temp",
      format: "png",
      width: 2000,
      height: 2000
    });
    
    // 1ページ目を変換
    const result = await convert(1, false);  // 1ページ目のみ、bulkモードoff
    console.log('画像変換結果:', result);
    
    if (!result || !result.path) {
      throw new Error('画像変換失敗');
    }
    
    // Tesseract.jsでOCR実行
    const Tesseract = require('tesseract.js');
    console.log('OCR処理実行中... (時間がかかる場合があります)');
    
    const { data: { text } } = await Tesseract.recognize(
      result.path,
      'jpn',  // 日本語
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR進行状況: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    console.log('✅ OCR成功');
    console.log(`抽出テキスト長: ${text.length}`);
    console.log('最初の500文字:');
    console.log(text.substring(0, 500));
    
    // 楽天カード特有の文字列を検索
    const rakutenKeywords = ['楽天カード', 'ご利用明細', 'ご利用日', 'ご利用店名', 'RAKUTEN'];
    console.log('\n楽天カード特有文字列:');
    rakutenKeywords.forEach(keyword => {
      const found = text.includes(keyword);
      console.log(`  "${keyword}": ${found ? '✅' : '❌'}`);
    });
    
    // 数値パターン検索（金額）
    const numberPattern = /[0-9,]+円|[0-9,]+\s*円/g;
    const numbers = text.match(numberPattern);
    if (numbers && numbers.length > 0) {
      console.log(`\n見つかった金額パターン: ${numbers.length}個`);
      console.log('例:', numbers.slice(0, 5).join(', '));
    }
    
    // 日付パターン検索
    const datePattern = /\d{1,2}\/\d{1,2}|\d{4}\/\d{1,2}\/\d{1,2}/g;
    const dates = text.match(datePattern);
    if (dates && dates.length > 0) {
      console.log(`\n見つかった日付パターン: ${dates.length}個`);
      console.log('例:', dates.slice(0, 5).join(', '));
    }
    
    return text;
    
  } catch (error) {
    console.error('❌ OCRテストエラー:', error.message);
    return null;
  }
}

async function testPdf2Pic() {
  try {
    console.log('\nPDF2PIC単体テスト...');
    const pdf2pic = require('pdf2pic');
    const pdfPath = process.env.HOME + '/Downloads/statement_202508.pdf';
    
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 150,
      saveFilename: "test-page",
      savePath: "./temp",
      format: "png",
      width: 1500,
      height: 1500
    });
    
    const result = await convert(1, false);
    console.log('✅ PDF2PIC成功:', result);
    return true;
    
  } catch (error) {
    console.error('❌ PDF2PICエラー:', error.message);
    return false;
  }
}

// メイン実行
async function main() {
  // まずはPDF2PICのみテスト
  const pdf2picOk = await testPdf2Pic();
  
  if (!pdf2picOk) {
    console.log('💥 PDF2PICが動作しないため、OCRテストを中止');
    return;
  }
  
  // OCRテスト実行
  const ocrText = await testTesseract();
  
  console.log('\n=== OCRテスト結果 ===');
  if (ocrText) {
    console.log('🎉 OCR処理成功 - 楽天カードPDFからテキスト抽出可能');
    console.log('この方法で楽天カード明細を処理できます');
  } else {
    console.log('💥 OCR処理失敗 - 追加の設定が必要かもしれません');
  }
}

main().catch(console.error);