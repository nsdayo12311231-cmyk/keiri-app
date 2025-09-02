import { NextRequest, NextResponse } from 'next/server';
import { ReceiptOCR } from '@/lib/ocr/vision-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, useGemini = true } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // Base64データサイズチェック（Vercel制限対応 - 圧縮機能導入により緩和）
    const base64Size = imageBase64.length;
    const maxBase64Size = 4.5 * 1024 * 1024; // 4.5MB (Vercel limit)
    console.log('受信した画像サイズ:', Math.round(base64Size / 1024), 'KB');
    
    if (base64Size > maxBase64Size) {
      console.error('Image too large even after compression:', { size: base64Size, limit: maxBase64Size });
      return NextResponse.json({ 
        error: `画像の自動圧縮後もサイズが大きすぎます。別の画像をお試しください。` 
      }, { status: 413 }); // 413 Payload Too Large
    }

    // サーバーサイドからAPIキーを取得
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const googleApiKey = process.env.GOOGLE_VISION_API_KEY;
    
    console.log('=== OCR API Debug ===');
    console.log('Gemini API Key exists:', !!geminiApiKey);
    console.log('Google Vision API Key exists:', !!googleApiKey);
    console.log('useGemini requested:', useGemini);
    
    let apiKey: string;
    let shouldUseGemini = useGemini;
    
    // 暫定的にGoogle Vision APIを優先使用（Gemini API問題回避のため）
    if (googleApiKey) {
      apiKey = googleApiKey;
      shouldUseGemini = false;
      console.log('Using Google Vision API (priority fallback)');
    } else if (useGemini && geminiApiKey) {
      apiKey = geminiApiKey;
      console.log('Using Gemini API');
    } else {
      console.error('No API keys available');
      return NextResponse.json({ 
        error: 'OCR API keys not configured on server' 
      }, { status: 500 });
    }

    // OCR処理実行
    const receiptOCR = new ReceiptOCR(apiKey, shouldUseGemini);
    const result = await receiptOCR.processReceipt(imageBase64);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('=== OCR API Critical Error ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    let errorMessage = 'OCR processing failed';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 特定のエラータイプに応じたメッセージ
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        errorMessage = 'API authentication failed';
        statusCode = 401;
      } else if (error.message.includes('API service') || error.message.includes('temporarily unavailable')) {
        errorMessage = 'API service temporarily unavailable';
        statusCode = 503;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error: Please check your internet connection';
        statusCode = 502;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Processing timeout: The operation took too long';
        statusCode = 504;
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'API usage limit reached. Please try again later';
        statusCode = 429;
      }
    }

    console.error('Returning error response:', { error: errorMessage, status: statusCode });

    return NextResponse.json({ 
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? {
        originalError: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      } : undefined
    }, { status: statusCode });
  }
}