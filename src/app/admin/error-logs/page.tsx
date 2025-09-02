'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Bug, Database, Eye, EyeOff, Search, X } from 'lucide-react'

interface ErrorLog {
  id: string
  user_id: string
  error_message: string
  error_stack: string
  error_type: string
  page_url: string
  user_agent: string
  browser_info: any
  additional_data: any
  created_at: string
}

export default function ErrorLogsPage() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [errorTypeFilter, setErrorTypeFilter] = useState('all')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  const pageSize = 20

  useEffect(() => {
    fetchErrorLogs()
  }, [currentPage, searchTerm, errorTypeFilter])

  const fetchErrorLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

      if (searchTerm) {
        query = query.or(`error_message.ilike.%${searchTerm}%,page_url.ilike.%${searchTerm}%`)
      }

      if (errorTypeFilter !== 'all') {
        query = query.eq('error_type', errorTypeFilter)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching logs:', error)
        return
      }

      setErrorLogs(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Failed to fetch error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedLogs(newExpanded)
  }

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'api_error':
        return <Database className="w-4 h-4" />
      case 'react_error':
      case 'react_error_boundary':
        return <Bug className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getErrorTypeBadge = (type: string) => {
    const colors = {
      api_error: 'bg-red-100 text-red-800',
      react_error: 'bg-orange-100 text-orange-800',
      react_error_boundary: 'bg-orange-100 text-orange-800',
      ui_error: 'bg-yellow-100 text-yellow-800',
      auth_error: 'bg-purple-100 text-purple-800',
      ocr_error: 'bg-blue-100 text-blue-800',
      javascript_error: 'bg-gray-100 text-gray-800',
      promise_rejection: 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">エラーログ管理</h1>
        <div className="text-sm text-gray-500">
          総件数: {totalCount}件
        </div>
      </div>

      {/* フィルタリング */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="エラーメッセージまたはURLで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="エラータイプ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全てのエラー</SelectItem>
                  <SelectItem value="api_error">APIエラー</SelectItem>
                  <SelectItem value="react_error">Reactエラー</SelectItem>
                  <SelectItem value="ui_error">UIエラー</SelectItem>
                  <SelectItem value="auth_error">認証エラー</SelectItem>
                  <SelectItem value="ocr_error">OCRエラー</SelectItem>
                  <SelectItem value="javascript_error">JavaScriptエラー</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setErrorTypeFilter('all')
                setCurrentPage(1)
              }}
            >
              <X className="w-4 h-4 mr-2" />
              クリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* エラーログ一覧 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : errorLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">エラーログが見つかりません</div>
        ) : (
          errorLogs.map((log) => {
            const isExpanded = expandedLogs.has(log.id)
            
            return (
              <Card key={log.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getErrorTypeIcon(log.error_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getErrorTypeBadge(log.error_type)}
                          <span className="text-sm text-gray-500">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <CardTitle className="text-lg truncate" title={log.error_message}>
                          {log.error_message}
                        </CardTitle>
                        {log.page_url && (
                          <p className="text-sm text-gray-600 truncate" title={log.page_url}>
                            {log.page_url}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(log.id)}
                    >
                      {isExpanded ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {log.error_stack && (
                        <div>
                          <h4 className="font-semibold mb-2">スタックトレース</h4>
                          <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                            {log.error_stack}
                          </pre>
                        </div>
                      )}
                      
                      {log.additional_data && (
                        <div>
                          <h4 className="font-semibold mb-2">追加データ</h4>
                          <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                            {JSON.stringify(log.additional_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {log.browser_info && (
                        <div>
                          <h4 className="font-semibold mb-2">ブラウザ情報</h4>
                          <div className="text-sm space-y-1">
                            <p><strong>User Agent:</strong> {log.user_agent}</p>
                            <p><strong>Language:</strong> {log.browser_info.language}</p>
                            <p><strong>Platform:</strong> {log.browser_info.platform}</p>
                            <p><strong>Screen:</strong> {log.browser_info.screen?.width}x{log.browser_info.screen?.height}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            前のページ
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
              return (
                <Button
                  key={pageNumber}
                  variant={pageNumber === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            次のページ
          </Button>
        </div>
      )}
    </div>
  )
}