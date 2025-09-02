'use client'

import React from 'react'
import { errorLogger } from '@/lib/utils/error-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // エラーをログに記録
    errorLogger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    }, 'react_error_boundary')
    
    // カスタムエラーハンドラがあれば実行
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps {
  error: Error
  resetError: () => void
}

function DefaultErrorFallback({ error, resetError }: DefaultErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            申し訳ございません
          </CardTitle>
          <p className="text-gray-600">
            予期しないエラーが発生しました。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={resetError}
              className="flex-1"
              variant="outline"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              再試行
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              ページを更新
            </Button>
          </div>
          
          {isDevelopment && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                開発者向け詳細情報
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded-md">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </div>
            </details>
          )}
          
          <p className="text-xs text-gray-500 text-center">
            このエラーは自動的に記録され、改善に役立てられます。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default ErrorBoundary

// Hook for functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: Record<string, any>) => {
    errorLogger.logError(error, errorInfo, 'hook_error')
  }, [])
}