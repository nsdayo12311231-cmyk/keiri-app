'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Receipt, 
  PieChart, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Upload,
  CheckCircle,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react';
import Link from 'next/link';

// デモ用のサンプルデータ
const DEMO_TRANSACTIONS = [
  {
    id: '1',
    date: '2024-08-26',
    description: 'スターバックス コーヒー',
    amount: 580,
    category: '会議費',
    isBusiness: true,
    confidence: 0.92,
    status: 'confirmed'
  },
  {
    id: '2',
    date: '2024-08-25',
    description: 'コクヨ 文房具購入',
    amount: 2340,
    category: '消耗品費',
    isBusiness: true,
    confidence: 0.88,
    status: 'pending'
  },
  {
    id: '3',
    date: '2024-08-24',
    description: 'ランチ（個人）',
    amount: 1200,
    category: '食費',
    isBusiness: false,
    confidence: 0.95,
    status: 'confirmed'
  }
];

export function DemoClient() {
  const [activeDemo, setActiveDemo] = useState<'receipt' | 'dashboard' | 'reports' | null>(null);

  if (activeDemo === 'receipt') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              レシート読み取りデモ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-4">レシートをアップロードしてください</p>
              <Button>ファイルを選択</Button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold">AI読み取り結果</span>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>店舗名:</strong> スターバックス コーヒー 渋谷店</p>
                <p><strong>金額:</strong> ¥580</p>
                <p><strong>日付:</strong> 2024-08-26</p>
                <p><strong>推定カテゴリ:</strong> 会議費</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">確信度: 92%</Badge>
                  <Badge variant="outline">事業用</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex gap-2">
          <Button onClick={() => setActiveDemo(null)} variant="outline">
            戻る
          </Button>
          <Button>承認して登録</Button>
        </div>
      </div>
    );
  }

  if (activeDemo === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">今月の売上</p>
                  <p className="text-2xl font-bold text-green-600">¥485,000</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">今月の経費</p>
                  <p className="text-2xl font-bold text-red-600">¥92,340</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">承認待ち</p>
                  <p className="text-2xl font-bold text-orange-600">3件</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>最近の取引</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEMO_TRANSACTIONS.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{transaction.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.isBusiness ? 'text-green-600' : 'text-gray-600'}`}>
                      ¥{transaction.amount.toLocaleString()}
                    </p>
                    <div className="flex gap-1">
                      <Badge variant={transaction.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                        {transaction.status === 'confirmed' ? '確認済' : '承認待ち'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Button onClick={() => setActiveDemo(null)} variant="outline">
          戻る
        </Button>
      </div>
    );
  }

  if (activeDemo === 'reports') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              月次レポート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">売上合計</p>
                <p className="text-2xl font-bold text-green-800">¥485,000</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">経費合計</p>
                <p className="text-2xl font-bold text-red-800">¥92,340</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">経費内訳</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>会議費</span>
                  <span>¥15,800</span>
                </div>
                <div className="flex justify-between">
                  <span>消耗品費</span>
                  <span>¥28,340</span>
                </div>
                <div className="flex justify-between">
                  <span>通信費</span>
                  <span>¥12,000</span>
                </div>
                <div className="flex justify-between">
                  <span>交通費</span>
                  <span>¥36,200</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Button onClick={() => setActiveDemo(null)} variant="outline">
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Keiri デモ</h1>
        <p className="text-gray-600 mb-8">
          実際の機能を体験してみてください。すべてサンプルデータで安全にお試しいただけます。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveDemo('receipt')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-blue-500" />
              レシート読み取り
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              レシートをアップロードして、AIが自動で内容を読み取る様子を体験できます。
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveDemo('dashboard')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-6 w-6 text-green-500" />
              ダッシュボード
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              売上・経費の状況や最近の取引を一覧で確認できるダッシュボードを体験できます。
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveDemo('reports')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-purple-500" />
              レポート機能
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              月次レポートや経費の内訳など、確定申告に役立つレポート機能を体験できます。
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Link href="/auth/signup">
          <Button size="lg" className="mr-4">
            無料で始める
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="lg">
            ホームに戻る
          </Button>
        </Link>
      </div>
    </div>
  );
}