import { NextRequest, NextResponse } from 'next/server';
import { ReceiptOCR } from '@/lib/ocr/vision-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, useGemini = true } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // サーバーサイドからAPIキーを取得
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const googleApiKey = process.env.GOOGLE_VISION_API_KEY;
    
    let apiKey: string;
    let shouldUseGemini = useGemini;
    
    if (useGemini && geminiApiKey) {
      apiKey = geminiApiKey;
    } else if (googleApiKey) {
      apiKey = googleApiKey;
      shouldUseGemini = false;
    } else {
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
    console.error('OCR API Error:', error);
    
    let errorMessage = 'OCR processing failed';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 特定のエラータイプに応じたメッセージ
      if (error.message.includes('API')) {
        errorMessage = 'API service temporarily unavailable';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error: Please check your internet connection';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Processing timeout: The operation took too long';
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'API usage limit reached. Please try again later';
      }
    }

    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}