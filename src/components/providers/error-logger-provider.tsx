'use client'

import { useEffect } from 'react'
import { errorLogger } from '@/lib/utils/error-logger'

interface ErrorLoggerProviderProps {
  children: React.ReactNode
}

export function ErrorLoggerProvider({ children }: ErrorLoggerProviderProps) {
  useEffect(() => {
    // グローバルエラーハンドラーを設定
    errorLogger.setupGlobalErrorHandler()
    
    // 未送信のローカルログを同期
    errorLogger.syncLocalLogs()
    
    // ページアンロード時にログを同期
    const handleBeforeUnload = () => {
      errorLogger.syncLocalLogs()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
  
  return <>{children}</>
}