// 手動APIテスト用スクリプト
// Node.js環境で実行

const fs = require('fs');
const FormData = require('form-data');

async function testCSVAPI() {
  try {
    console.log('CSV API テスト開始...');
    
    // テストCSVファイルを読み込み
    const csvContent = fs.readFileSync('./test_data/sample.csv');
    const formData = new FormData();
    formData.append('file', csvContent, 'test.csv');
    
    // ローカルAPIに送信（認証なし状態でのテスト）
    const response = await fetch('http://localhost:3002/api/import/csv', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    console.log('CSVレスポンス:', result);
    console.log('ステータス:', response.status);
    
  } catch (error) {
    console.error('CSV APIテストエラー:', error);
  }
}

async function testReceiptAPI() {
  try {
    console.log('Receipt OCR API テスト開始...');
    
    // ダミーのBase64画像データ（小さな1x1px画像）
    const dummyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
    
    const response = await fetch('http://localhost:3002/api/ocr/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: dummyBase64,
        useGemini: true
      }),
    });
    
    const result = await response.json();
    console.log('Receipt OCRレスポンス:', result);
    console.log('ステータス:', response.status);
    
  } catch (error) {
    console.error('Receipt APIテストエラー:', error);
  }
}

// テスト実行
testCSVAPI();
testReceiptAPI();