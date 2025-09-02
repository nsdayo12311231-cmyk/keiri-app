// 本番環境でのエラー監視
export class ErrorTracker {
  static captureException(error: Error, context?: any) {
    if (process.env.NODE_ENV === 'production') {
      // Sentry、LogRocket等の監視サービス統合
      console.error('Production Error:', error, context);
      
      // 自動的にSupabaseにエラーログ保存
      this.logToDatabase(error, context);
    }
  }

  static async logToDatabase(error: Error, context?: any) {
    try {
      // エラーログテーブルに自動保存
      const { createSimpleServerClient } = await import('@/lib/supabase/server');
      const supabase = createSimpleServerClient();
      
      await supabase.from('error_logs').insert({
        error_message: error.message,
        error_stack: error.stack,
        context: context,
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : null
      });
    } catch (logError) {
      console.error('Error logging failed:', logError);
    }
  }
}