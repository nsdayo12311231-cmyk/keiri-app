import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, stack, context, timestamp, userAgent } = body;

    // エラー情報を詳細にログ出力（サーバー側で確認可能）
    console.log('🔍====== 自動エラーレポート受信 ======');
    console.log('📅 時刻:', timestamp);
    console.log('🖥️ ユーザーエージェント:', userAgent);
    console.log('❌ エラー:', error);
    console.log('📋 コンテキスト:', JSON.stringify(context, null, 2));
    
    if (stack) {
      console.log('📍 スタックトレース:');
      console.log(stack);
    }
    
    console.log('=====================================');

    // 環境情報の詳細分析（統一処理後）
    const isWindows = userAgent?.includes('Windows') || false;
    const isMac = userAgent?.includes('Mac') || false;
    const isChrome = userAgent?.includes('Chrome') || false;
    const isEdge = userAgent?.includes('Edge') || false;
    
    console.log('🔎 環境分析（統一処理版）:');
    console.log(`- 環境: ${isWindows ? 'Windows' : isMac ? 'macOS' : 'Other'}`);
    console.log(`- ブラウザ: ${isChrome ? 'Chrome' : isEdge ? 'Edge' : 'Other'}`);
    
    // 統一処理後のエラーパターン分析
    if (error?.includes('Canvas') || error?.includes('toDataURL')) {
      console.log('⚠️ Canvas関連エラー検出（統一処理版で発生）');
    }
    
    if (error?.includes('timeout') || error?.includes('タイムアウト')) {
      console.log('⏰ タイムアウトエラー検出（20秒統一設定）');
    }
    
    if (error?.includes('memory') || error?.includes('メモリ')) {
      console.log('💾 メモリ関連エラー検出（統一品質設定）');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'エラーレポートを受信しました' 
    });

  } catch (error) {
    console.error('エラーレポートAPI自体でエラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'エラーレポート処理に失敗' 
    }, { status: 500 });
  }
}