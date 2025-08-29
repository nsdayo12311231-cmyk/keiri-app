'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Smartphone, Monitor } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedFileType, setDraggedFileType] = useState<'csv' | 'pdf' | null>(null);
  const router = useRouter();

  // グローバルなドラッグイベント防止
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => e.preventDefault();

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    
    if (file) {
      if (file.type === 'text/csv') {
        // CSVファイルの場合、CSVインポートページに移動
        router.push('/import/csv');
      } else if (file.type === 'application/pdf') {
        // PDFファイルの場合、PDFインポートページに移動
        router.push('/import/pdf');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.items[0];
    if (file) {
      if (file.type === 'text/csv') {
        setDraggedFileType('csv');
      } else if (file.type === 'application/pdf') {
        setDraggedFileType('pdf');
      } else {
        setDraggedFileType(null);
      }
    }
    setIsDragOver(true);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragOver(false);
    setDraggedFileType(null);
  };

  return (
    <div 
      className={`min-h-screen bg-background ${isDragOver ? 'bg-blue-50' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      ファイルインポート
                    </h1>
                    <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-1"></div>
                  </div>
                </div>
                <p className="text-gray-600 text-lg mb-3">
                  📁 お好みの形式でデータをインポートしてください
                </p>
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-3">
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
                    <span className="animate-bounce">👆</span>
                    ファイルを画面にドラッグ&ドロップするだけで自動判別・インポートできます
                  </p>
                </div>
              </div>

              {/* ドラッグオーバー時の表示 */}
              {isDragOver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md mx-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      {draggedFileType === 'csv' ? (
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      ) : draggedFileType === 'pdf' ? (
                        <FileText className="h-8 w-8 text-blue-600" />
                      ) : (
                        <FileText className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {draggedFileType === 'csv' ? (
                        '🎯 CSVファイルを検出'
                      ) : draggedFileType === 'pdf' ? (
                        '🎯 PDFファイルを検出'
                      ) : (
                        '❌ 未対応ファイル形式'
                      )}
                    </h3>
                    <p className="text-gray-600">
                      {draggedFileType === 'csv' ? (
                        'CSVインポートページに移動します'
                      ) : draggedFileType === 'pdf' ? (
                        'PDFインポートページに移動します'
                      ) : (
                        'CSV・PDFファイルのみ対応しています'
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* CSVインポート */}
                <Card className={`border-2 transition-all hover:shadow-lg ${
                  isDragOver && draggedFileType === 'csv' 
                    ? 'border-green-400 bg-green-50 shadow-lg scale-105' 
                    : 'border-green-200 hover:border-green-300'
                }`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <FileSpreadsheet className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-green-700">CSV明細インポート</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Monitor className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">PC推奨・高精度</span>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="ml-15 text-gray-600">
                      銀行・クレジットカード明細のCSVファイルを高精度でインポート
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        楽天カード、三井住友カード、銀行明細CSV
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        正確な金額・日付・摘要情報
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        自動カテゴリ分類（信頼度99%）
                      </div>
                    </div>
                    <Button asChild className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                      <Link href="/import/csv">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        CSVファイルを選択
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* PDFインポート */}
                <Card className={`border-2 transition-all hover:shadow-lg ${
                  isDragOver && draggedFileType === 'pdf' 
                    ? 'border-blue-400 bg-blue-50 shadow-lg scale-105' 
                    : 'border-blue-200 hover:border-blue-300'
                }`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-blue-700">PDF明細インポート</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Smartphone className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-600 font-medium">スマホ対応・便利</span>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="ml-15 text-gray-600">
                      PDF明細書をそのままアップロードして自動解析
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        楽天カード、三井住友カード、銀行PDF
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        テキスト・画像PDF両対応（OCR）
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        スマホから直接アップロード可能
                      </div>
                    </div>
                    <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                      <Link href="/import/pdf">
                        <FileText className="mr-2 h-4 w-4" />
                        PDFファイルを選択
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* 対応フォーマット一覧 */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>対応フォーマット一覧</CardTitle>
                  <CardDescription>以下の金融機関・カードの明細に対応しています</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3 text-green-700">📄 CSV対応</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• 楽天カード明細CSV</li>
                        <li>• 三井住友カード明細CSV</li>
                        <li>• PayPayカード明細CSV</li>
                        <li>• 各銀行明細CSV</li>
                        <li>• 汎用CSV形式</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3 text-blue-700">📋 PDF対応</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• 楽天カード明細PDF</li>
                        <li>• 三井住友カード明細PDF</li>
                        <li>• PayPayカード明細PDF</li>
                        <li>• 銀行明細PDF</li>
                        <li>• スキャン画像PDF（OCR）</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3 text-purple-700">⚙️ 機能</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• 自動カテゴリ分類</li>
                        <li>• 事業/個人支出判定</li>
                        <li>• 重複取引検出</li>
                        <li>• 手動カテゴリ修正</li>
                        <li>• 一括保存</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden">
        <div className="pb-16">
          <main className="p-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">ファイルインポート</h1>
              <p className="text-muted-foreground">お好みの形式を選択してください</p>
            </div>

            <div className="space-y-4">
              {/* モバイル用CSVカード */}
              <Card className="border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                    <div>
                      <CardTitle className="text-lg text-green-700">CSV明細</CardTitle>
                      <CardDescription className="text-sm">高精度・PC推奨</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full bg-green-500 hover:bg-green-600">
                    <Link href="/import/csv">CSVをアップロード</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* モバイル用PDFカード */}
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg text-blue-700">PDF明細</CardTitle>
                      <CardDescription className="text-sm">便利・スマホ対応</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full bg-blue-500 hover:bg-blue-600">
                    <Link href="/import/pdf">PDFをアップロード</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}