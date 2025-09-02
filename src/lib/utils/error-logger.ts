import { createClient } from '@/lib/supabase/client'

interface ErrorLogData {
  errorMessage: string
  errorStack?: string
  errorType?: string
  pageUrl?: string
  additionalData?: Record<string, any>
}

interface BrowserInfo {
  userAgent: string
  language: string
  platform: string
  cookieEnabled: boolean
  onLine: boolean
  screen: {
    width: number
    height: number
    colorDepth: number
  }
}

class ErrorLogger {
  private supabase = createClient()
  
  private getBrowserInfo(): BrowserInfo {
    if (typeof window === 'undefined') {
      return {} as BrowserInfo
    }
    
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    }
  }
  
  private getCurrentUrl(): string {
    if (typeof window === 'undefined') return ''
    return window.location.href
  }
  
  async logError(error: Error | string, additionalData?: Record<string, any>, errorType?: string) {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message
      const errorStack = typeof error === 'string' ? undefined : error.stack
      
      const logData = {
        error_message: errorMessage,
        error_stack: errorStack,
        error_type: errorType || 'unknown',
        page_url: this.getCurrentUrl(),
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
        browser_info: this.getBrowserInfo(),
        additional_data: additionalData,
        created_at: new Date().toISOString()
      }
      
      const { error: supabaseError } = await this.supabase
        .from('error_logs')
        .insert(logData)
      
      if (supabaseError) {
        console.error('Failed to log error to Supabase:', supabaseError)
        // フォールバック: ローカルストレージに保存
        this.fallbackToLocalStorage(logData)
      }
      
    } catch (logError) {
      console.error('Error logging failed:', logError)
    }
  }
  
  private fallbackToLocalStorage(logData: any) {
    try {
      const existingLogs = localStorage.getItem('keiri_error_logs')
      const logs = existingLogs ? JSON.parse(existingLogs) : []
      logs.push(logData)
      
      // 最大100件まで保存
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100)
      }
      
      localStorage.setItem('keiri_error_logs', JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }
  
  // 未送信のローカルログをサーバーに送信
  async syncLocalLogs() {
    try {
      const localLogs = localStorage.getItem('keiri_error_logs')
      if (!localLogs) return
      
      const logs = JSON.parse(localLogs)
      
      const { error } = await this.supabase
        .from('error_logs')
        .insert(logs)
      
      if (!error) {
        localStorage.removeItem('keiri_error_logs')
      }
      
    } catch (error) {
      console.error('Failed to sync local logs:', error)
    }
  }
  
  // JavaScript エラーの自動キャッチ
  setupGlobalErrorHandler() {
    if (typeof window === 'undefined') return
    
    // 未処理のエラーをキャッチ
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }, 'javascript_error')
    })
    
    // Promise の reject をキャッチ
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason, {
        type: 'unhandled_promise_rejection'
      }, 'promise_rejection')
    })
    
    // React エラー境界用
    const originalConsoleError = console.error
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('React')) {
        this.logError(new Error(args.join(' ')), {
          reactError: true,
          args: args
        }, 'react_error')
      }
      originalConsoleError.apply(console, args)
    }
  }
}

export const errorLogger = new ErrorLogger()

// 便利な関数をエクスポート
export const logError = (error: Error | string, additionalData?: Record<string, any>, errorType?: string) => {
  return errorLogger.logError(error, additionalData, errorType)
}

// 特定のエラータイプ用の便利関数
export const logAPIError = (error: Error | string, apiEndpoint: string, requestData?: any) => {
  return logError(error, { apiEndpoint, requestData }, 'api_error')
}

export const logUIError = (error: Error | string, component: string, props?: any) => {
  return logError(error, { component, props }, 'ui_error')
}

export const logAuthError = (error: Error | string, action: string) => {
  return logError(error, { action }, 'auth_error')
}

export const logOCRError = (error: Error | string, fileInfo?: any) => {
  return logError(error, { fileInfo }, 'ocr_error')
}