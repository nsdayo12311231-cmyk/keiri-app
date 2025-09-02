'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getActivityTracker, trackFeatureUse } from '@/lib/analytics/activity-tracker'
import { createClient } from '@/lib/supabase/client'

export default function ActivityDebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [tableExists, setTableExists] = useState<boolean | null>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-19), `${timestamp}: ${message}`])
  }

  useEffect(() => {
    addLog('デバッグページが読み込まれました')
    
    // ユーザー情報を取得
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        addLog(`認証エラー: ${error.message}`)
      } else if (user) {
        setUserInfo(user)
        addLog(`ログイン中のユーザー: ${user.email}`)
      } else {
        addLog('ユーザーがログインしていません')
      }
    }

    // テーブルの存在確認
    const checkTables = async () => {
      const supabase = createClient()
      
      try {
        const { data, error } = await supabase
          .from('user_activities')
          .select('count', { count: 'exact', head: true })
        
        if (error) {
          addLog(`テーブルエラー: ${error.message}`)
          setTableExists(false)
        } else {
          addLog('user_activitiesテーブルが存在します')
          setTableExists(true)
        }
      } catch (error) {
        addLog(`テーブルチェックエラー: ${error}`)
        setTableExists(false)
      }
    }

    checkUser()
    checkTables()

    // ActivityTrackerの初期化を確認
    try {
      const tracker = getActivityTracker()
      addLog('ActivityTracker が初期化されました')
      setIsTracking(true)
    } catch (error) {
      addLog(`ActivityTracker初期化エラー: ${error}`)
    }

    // コンソールログをキャプチャ
    const originalLog = console.log
    const originalError = console.error
    
    console.log = (...args) => {
      if (args[0] === '[ActivityTracker]') {
        addLog(`Console: ${args.slice(1).join(' ')}`)
      }
      originalLog.apply(console, args)
    }
    
    console.error = (...args) => {
      if (args[0] === '[ActivityTracker]') {
        addLog(`Error: ${args.slice(1).join(' ')}`)
      }
      originalError.apply(console, args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  const testPageView = () => {
    addLog('手動でページビューをテスト中...')
    const tracker = getActivityTracker()
    // プライベートメソッドなので、公開メソッドを使用
  }

  const testClick = () => {
    addLog('手動でクリックイベントをテスト中...')
    // このボタンのクリック自体が追跡される
  }

  const testFeature = async () => {
    addLog('手動で機能使用をテスト中...')
    try {
      await trackFeatureUse('debug-test', true, 1000)
      addLog('機能使用の追跡が完了しました')
    } catch (error) {
      addLog(`機能使用の追跡エラー: ${error}`)
    }
  }

  const testDirectInsert = async () => {
    addLog('直接データベースに挿入をテスト中...')
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('user_activities')
        .insert({
          user_id: userInfo?.id || null,
          session_id: `test-${Date.now()}`,
          action_type: 'direct_test',
          page_url: window.location.href,
          additional_data: { test: true }
        })
      
      if (error) {
        addLog(`直接挿入エラー: ${error.message}`)
      } else {
        addLog('直接挿入が成功しました')
      }
    } catch (error) {
      addLog(`直接挿入例外: ${error}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">アクティビティ追跡デバッグ</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 状態確認 */}
        <Card>
          <CardHeader>
            <CardTitle>システム状態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>追跡状態: {isTracking ? '✅ 有効' : '❌ 無効'}</p>
              <p>ユーザー: {userInfo ? `✅ ${userInfo.email}` : '❌ 未ログイン'}</p>
              <p>テーブル: {tableExists === true ? '✅ 存在' : tableExists === false ? '❌ 不存在' : '⏳ 確認中'}</p>
            </div>
          </CardContent>
        </Card>

        {/* テストボタン */}
        <Card>
          <CardHeader>
            <CardTitle>テスト実行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button onClick={testPageView} className="w-full">
                ページビューテスト
              </Button>
              <Button onClick={testClick} className="w-full">
                クリックテスト
              </Button>
              <Button onClick={testFeature} className="w-full">
                機能使用テスト
              </Button>
              <Button onClick={testDirectInsert} className="w-full">
                直接DB挿入テスト
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ログ表示 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>デバッグログ</CardTitle>
            <Button onClick={clearLogs} variant="outline" size="sm">
              クリア
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-md h-64 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p>ログが表示されます...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}