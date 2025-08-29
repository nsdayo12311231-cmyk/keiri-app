// 手動PDFテスト用スクリプト
const fs = require('fs');
const path = require('path');

console.log('=== 楽天カードPDFテスト開始 ===');

// 1. まずはファイルが存在するか確認
const possiblePaths = [
  './statement_202508.pdf',
  '../statement_202508.pdf', 
  './public/statement_202508.pdf',
  './uploads/statement_202508.pdf',
  process.env.HOME + '/Downloads/statement_202508.pdf'
];

console.log('PDFファイルを検索中...');
let pdfPath = null;
for (const testPath of possiblePaths) {
  try {
    if (fs.existsSync(testPath)) {
      pdfPath = testPath;
      console.log(`✅ PDFファイル発見: ${testPath}`);
      break;
    }
  } catch (e) {
    // ignore
  }
}

if (!pdfPath) {
  console.log('❌ PDFファイルが見つかりません');
  console.log('検索パス:', possiblePaths);
  process.exit(1);
}

// 2. ファイル情報確認
try {
  const stats = fs.statSync(pdfPath);
  console.log('📄 ファイル情報:');
  console.log(`  - サイズ: ${stats.size} bytes`);
  console.log(`  - 更新日: ${stats.mtime}`);
  
  // 3. ファイル内容読み込み
  const buffer = fs.readFileSync(pdfPath);
  console.log(`  - Buffer長: ${buffer.length}`);
  console.log(`  - PDF識別子: ${buffer.toString('ascii', 0, 4) === '%PDF' ? '✅' : '❌'}`);
  console.log(`  - 最初のバイト: ${buffer.slice(0, 20).toString('hex')}`);
  
} catch (error) {
  console.error('❌ ファイル読み込みエラー:', error.message);
  process.exit(1);
}

console.log('\n=== PDF処理ライブラリテスト ===');

async function testPdfParse() {
  try {
    console.log('pdf-parseテスト中...');
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(pdfPath);
    
    const data = await pdfParse(buffer);
    console.log('✅ pdf-parse成功:');
    console.log(`  - ページ数: ${data.numpages}`);
    console.log(`  - テキスト長: ${data.text.length}`);
    
    if (data.text.length > 0) {
      console.log(`  - 最初の200文字:`);
      console.log(`    "${data.text.substring(0, 200)}"`);
      
      // 楽天カード特有の文字列検索
      const rakutenKeywords = ['楽天カード', 'ご利用明細', 'ご利用日', 'ご利用店名'];
      console.log('  - 楽天カード特有文字列:');
      rakutenKeywords.forEach(keyword => {
        const found = data.text.includes(keyword);
        console.log(`    "${keyword}": ${found ? '✅' : '❌'}`);
      });
    }
    
    return data.text;
    
  } catch (error) {
    console.error('❌ pdf-parseエラー:', error.message);
    return null;
  }
}

async function testPdf2Json() {
  try {
    console.log('\npdf2jsonテスト中...');
    const PDFParser = require('pdf2json');
    const buffer = fs.readFileSync(pdfPath);
    
    return new Promise((resolve) => {
      const pdfParser = new PDFParser();
      let resolved = false;
      
      // タイムアウト設定
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('❌ pdf2json タイムアウト (10秒)');
          resolve(null);
        }
      }, 10000);
      
      pdfParser.on("pdfParser_dataError", (errData) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.error('❌ pdf2jsonエラー:', errData.parserError);
          resolve(null);
        }
      });
      
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          
          console.log('✅ pdf2json成功:');
          console.log(`  - ページ数: ${pdfData.Meta?.Pages || 0}`);
          console.log(`  - formImageあり: ${!!pdfData.formImage}`);
          
          let extractedText = '';
          if (pdfData.formImage && pdfData.formImage.Pages) {
            for (const page of pdfData.formImage.Pages) {
              if (page.Texts) {
                for (const textItem of page.Texts) {
                  if (textItem.R) {
                    for (const run of textItem.R) {
                      if (run.T) {
                        const decodedText = decodeURIComponent(run.T);
                        extractedText += decodedText + ' ';
                      }
                    }
                  }
                }
              }
            }
          }
          
          console.log(`  - 抽出テキスト長: ${extractedText.length}`);
          if (extractedText.length > 0) {
            console.log(`  - 最初の200文字:`);
            console.log(`    "${extractedText.substring(0, 200)}"`);
          }
          
          resolve(extractedText.trim());
        }
      });
      
      pdfParser.parseBuffer(buffer);
    });
    
  } catch (error) {
    console.error('❌ pdf2json初期化エラー:', error.message);
    return null;
  }
}

// メイン実行
async function main() {
  const pdfParseText = await testPdfParse();
  const pdf2JsonText = await testPdf2Json();
  
  console.log('\n=== 結果まとめ ===');
  console.log(`pdf-parse: ${pdfParseText ? `✅ ${pdfParseText.length}文字` : '❌ 失敗'}`);
  console.log(`pdf2json: ${pdf2JsonText ? `✅ ${pdf2JsonText.length}文字` : '❌ 失敗'}`);
  
  if (pdfParseText || pdf2JsonText) {
    console.log('🎉 少なくとも1つのライブラリでPDF読み取り成功');
  } else {
    console.log('💥 両方のライブラリでPDF読み取り失敗');
  }
}

main().catch(console.error);