'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SimpleDebugPage() {
  const [logs, setLogs] = useState<string[]>(['シンプルデバッグページが読み込まれました'])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-19), `${timestamp}: ${message}`])
  }

  const testBasicFunction = () => {
    addLog('基本機能のテストが実行されました')
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">シンプルデバッグページ</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本テスト */}
        <Card>
          <CardHeader>
            <CardTitle>基本テスト</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testBasicFunction} className="w-full">
              基本機能テスト
            </Button>
          </CardContent>
        </Card>

        {/* ログ表示 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ログ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-md h-32 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}