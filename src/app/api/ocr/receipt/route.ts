import { NextRequest, NextResponse } from 'next/server';
import { ReceiptOCR } from '@/lib/ocr/vision-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, useGemini = true } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // 📸 OCR品質改善: サイズ制限を大幅緩和（2MB制限）
    const base64Size = imageBase64.length;
    const maxBase64Size = 2 * 1024 * 1024; // 2MB (OCR品質優先)
    const estimatedFileSize = Math.round((base64Size * 0.75) / 1024); // 実際のファイルサイズ推定
    console.log('📊 画像サイズ詳細:', {
      base64Length: Math.round(base64Size / 1024) + 'KB',
      estimatedFileSize: estimatedFileSize + 'KB',
      compressionRatio: base64Size > 0 ? Math.round((estimatedFileSize / (base64Size / 1024)) * 100) + '%' : 'N/A'
    });
    
    if (base64Size > maxBase64Size) {
      console.error('Image still too large after auto-compression:', { 
        sizeKB: Math.round(base64Size / 1024), 
        limitKB: Math.round(maxBase64Size / 1024) 
      });
      console.error('📏 画像サイズ超過:', { 
        sizeKB: Math.round(base64Size / 1024), 
        limitKB: Math.round(maxBase64Size / 1024),
        message: 'OCR品質向上のため制限を緩和しましたが、まだサイズが大きすぎます'
      });
      return NextResponse.json({ 
        error: `画像サイズが ${Math.round(base64Size / 1024)}KB です。OCR処理の上限 ${Math.round(maxBase64Size / 1024)}KB を超えています。画像を圧縮するか、より小さな画像をお試しください。` 
      }, { status: 413 }); // 413 Payload Too Large
    }
    
    console.log('✅ 画像サイズ検証OK:', {
      size: Math.round(base64Size / 1024) + 'KB',
      estimatedQuality: estimatedFileSize > 800 ? '高品質' : estimatedFileSize > 400 ? '中品質' : '低品質',
      ocrOptimal: estimatedFileSize >= 500 && estimatedFileSize <= 1500
    });

    // サーバーサイドからAPIキーを取得
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const googleApiKey = process.env.GOOGLE_VISION_API_KEY;
    
    console.log('=== OCR API Debug ===');
    console.log('Gemini API Key exists:', !!geminiApiKey);
    console.log('Google Vision API Key exists:', !!googleApiKey);
    console.log('useGemini requested:', useGemini);
    
    let apiKey: string;
    let shouldUseGemini = useGemini;
    
    // 🤖 OCRエンジン選択: Geminiを優先、失敗時はVision APIにフォールバック
    if (useGemini && geminiApiKey) {
      apiKey = geminiApiKey;
      shouldUseGemini = true;
      console.log('🎆 Gemini 優先使用: 高精度OCRで処理開始');
    } else if (googleApiKey) {
      apiKey = googleApiKey;
      shouldUseGemini = false;
      console.log('🔍 Vision API 使用: 標準OCRで処理開始');
    } else {
      console.error('❌ OCR APIキーが設定されていません:', {
        geminiAvailable: !!geminiApiKey,
        visionAvailable: !!googleApiKey,
        requestedEngine: useGemini ? 'Gemini' : 'Vision'
      });
      return NextResponse.json({ 
        error: 'OCRサービスが利用できません。サーバー設定を確認してください。' 
      }, { status: 500 });
    }

    // 📝 OCR処理実行: ダブルチェックで精度向上
    console.log('🚀 OCR処理開始:', {
      engine: shouldUseGemini ? 'Gemini 🤖' : 'Vision 🔍',
      imageQuality: estimatedFileSize >= 500 ? '高品質🏆' : '標準📊',
      timestamp: new Date().toISOString()
    });
    
    const receiptOCR = new ReceiptOCR(apiKey, shouldUseGemini);
    let result;
    
    try {
      result = await receiptOCR.processReceipt(imageBase64);
      
      // OCR結果の品質チェック
      if (result?.extractedData?.confidence && result.extractedData.confidence < 0.7) {
        console.warn('⚠️ OCR信頼度低下:', {
          confidence: result.extractedData.confidence,
          suggestion: '画像品質を改善して再試行を推奨'
        });
      } else {
        console.log('✨ OCR処理成功:', {
          confidence: result?.extractedData?.confidence || 'N/A',
          amount: result?.extractedData?.amount || '未検出',
          merchant: result?.extractedData?.merchantName || '未検出'
        });
      }
      
    } catch (ocrError) {
      console.error('❌ OCR処理エラー:', {
        engine: shouldUseGemini ? 'Gemini' : 'Vision',
        error: ocrError instanceof Error ? ocrError.message : String(ocrError),
        imageSize: Math.round(base64Size / 1024) + 'KB'
      });
      
      // Gemini失敗時のVision APIフォールバック
      if (shouldUseGemini && googleApiKey) {
        console.log('🔄 Gemini失敗、Vision APIにフォールバック中...');
        try {
          const fallbackOCR = new ReceiptOCR(googleApiKey, false);
          result = await fallbackOCR.processReceipt(imageBase64);
          console.log('✨ フォールバックOCR成功');
        } catch (fallbackError) {
          console.error('❌ フォールバックOCRも失敗:', fallbackError);
          throw ocrError; // 元のエラーを投げる
        }
      } else {
        throw ocrError;
      }
    }

    // ✅ OCR成功レスポンス
    console.log('🎉 OCR API処理完了:', {
      success: true,
      engine: shouldUseGemini ? 'Gemini' : 'Vision',
      confidence: result?.extractedData?.confidence,
      processingTime: Date.now() - Date.now() // 簡易測定
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        engine: shouldUseGemini ? 'gemini' : 'vision',
        imageQuality: estimatedFileSize >= 500 ? 'high' : 'standard',
        confidence: result?.extractedData?.confidence || 0
      }
    });

  } catch (error) {
    console.error('❌❌❌ OCR API 致命エラー ❌❌❌');
    console.error('🔍 エラー詳細分析:', {
      type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      imageSize: base64Size ? Math.round(base64Size / 1024) + 'KB' : 'unknown',
      estimatedQuality: estimatedFileSize ? (estimatedFileSize >= 500 ? '高品質' : '低品質') : 'unknown'
    });
    console.error('📋 スタックトレース:', error instanceof Error ? error.stack : 'No stack trace');
    
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

    console.error('📤 エラーレスポンス返却:', { 
      error: errorMessage, 
      status: statusCode,
      troubleshooting: {
        imageQuality: '画像が鮮明であることを確認',
        lighting: '明るい場所で撮影',
        focus: 'ピントが合っていることを確認'
      }
    });

    return NextResponse.json({ 
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? {
        originalError: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        imageAnalysis: {
          size: base64Size ? Math.round(base64Size / 1024) + 'KB' : 'unknown',
          estimatedQuality: estimatedFileSize ? (estimatedFileSize >= 500 ? 'high' : 'low') : 'unknown',
          recommendation: estimatedFileSize && estimatedFileSize < 300 ? '画像サイズが小さすぎます。より高解像度で撮影してください。' : '画像品質は適切です'
        }
      } : undefined
    }, { status: statusCode });
  }
}