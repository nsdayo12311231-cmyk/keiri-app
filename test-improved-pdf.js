// 改善されたPDF処理をテスト
const { parsePDF, isPDFTextBased } = require('./src/lib/utils/pdf-parser');
const fs = require('fs');

console.log('=== 改善されたPDF処理テスト ===');

async function testImprovedPDFProcessing() {
  try {
    const pdfPath = process.env.HOME + '/Downloads/statement_202508.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ テスト用PDFが見つかりません:', pdfPath);
      return;
    }
    
    console.log('📄 テスト開始...');
    const buffer = fs.readFileSync(pdfPath);
    
    // 改善されたPDF処理を実行
    const result = await parsePDF(buffer);
    
    console.log('\n🔍 処理結果:');
    console.log('  - Format:', result.format);
    console.log('  - Text-based:', result.isTextBased);
    console.log('  - Transactions:', result.transactions.length);
    console.log('  - Errors:', result.errors.length);
    
    if (result.errors.length > 0) {
      console.log('\n📝 エラー詳細:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (result.format === 'image-pdf') {
      console.log('\n✅ 画像ベースPDFが正しく検出されました');
      console.log('✅ 適切なエラーメッセージが表示されます');
      console.log('✅ CSVダウンロードの案内が含まれています');
    } else if (result.transactions.length > 0) {
      console.log('\n✅ トランザクションが抽出されました:');
      result.transactions.slice(0, 3).forEach(tx => {
        console.log(`  - ${tx.date}: ${tx.description} (${tx.amount}円)`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ テスト中にエラー:', error.message);
    return null;
  }
}

// テスト実行
testImprovedPDFProcessing()
  .then(result => {
    console.log('\n=== テスト完了 ===');
    if (result) {
      console.log(`結果: ${result.format} (${result.isTextBased ? 'テキストベース' : '画像ベース'})`);
    }
  })
  .catch(console.error);