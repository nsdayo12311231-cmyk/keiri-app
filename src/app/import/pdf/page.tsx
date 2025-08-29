'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft, AlertTriangle, Smartphone, Camera, Upload, Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface ProcessingState {
  isProcessing: boolean;
  fileName: string;
  progress: string;
}

interface PDFResult {
  transactions: any[];
  summary: any;
  error?: string;
  details?: string[];
  helpMessage?: string;
  isImagePDF?: boolean;
}

export default function PDFImportPage() {
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    fileName: '',
    progress: ''
  });
  const [result, setResult] = useState<PDFResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      alert('PDFファイルを選択してください');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください');
      return;
    }

    setProcessing({
      isProcessing: true,
      fileName: file.name,
      progress: 'PDF解析中...'
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Supabaseセッションを取得してヘッダーに追加
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/import/pdf', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setResult({
          transactions: [],
          summary: { total: 0, unique: 0, duplicates: 0 },
          error: data.error,
          details: data.details,
          helpMessage: data.helpMessage,
          isImagePDF: data.isImagePDF
        });
      } else {
        setResult({
          transactions: data.transactions,
          summary: data.summary,
        });
      }

    } catch (error) {
      console.error('PDF処理エラー:', error);
      setResult({
        transactions: [],
        summary: { total: 0, unique: 0, duplicates: 0 },
        error: 'PDFの処理中にエラーが発生しました'
      });
    } finally {
      setProcessing({
        isProcessing: false,
        fileName: '',
        progress: ''
      });
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-4xl mx-auto">
              {/* ヘッダー */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="outline" asChild>
                    <Link href="/import">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      インポート選択に戻る
                    </Link>
                  </Button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                      PDF明細インポート
                    </h1>
                    <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full mt-1"></div>
                  </div>
                </div>
                <p className="text-gray-600 text-lg">
                  📄 PDF明細書をスマホから簡単アップロード
                </p>
              </div>


              {/* PDFアップロード機能 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">PDFファイルをアップロード</CardTitle>
                  <CardDescription>
                    楽天カード、三井住友カード、銀行明細PDFに対応しています
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {processing.isProcessing ? (
                      <div className="border-2 border-cyan-300 dark:border-cyan-600 rounded-xl p-8 text-center bg-gradient-to-br from-cyan-50 to-purple-50 dark:from-cyan-950 dark:to-purple-950">
                        <Loader2 className="h-12 w-12 text-cyan-500 mx-auto mb-4 animate-spin" />
                        <p className="text-lg font-medium text-cyan-700 dark:text-cyan-300 mb-2">処理中...</p>
                        <p className="text-sm text-gray-600 mb-2">{processing.fileName}</p>
                        <p className="text-sm text-cyan-600 dark:text-cyan-400">{processing.progress}</p>
                      </div>
                    ) : (
                      <div 
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                          dragOver 
                            ? 'border-cyan-400 bg-gradient-to-br from-cyan-100 to-purple-100 dark:from-cyan-900 dark:to-purple-900 scale-105' 
                            : 'border-cyan-300 dark:border-cyan-600 hover:border-cyan-400 dark:hover:border-cyan-500 hover:bg-gradient-to-br hover:from-cyan-50 hover:to-purple-50 dark:hover:from-cyan-950 dark:hover:to-purple-950'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <FileText className="h-12 w-12 text-cyan-500 mx-auto mb-4" />
                        <p className="text-lg font-medium text-cyan-700 dark:text-cyan-300 mb-2">
                          {dragOver ? 'ここにドロップしてください' : 'PDFファイルをここにドラッグ'}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">または下記のボタンからファイルを選択してください</p>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          id="pdf-upload"
                          onChange={handleFileInputChange}
                        />
                        <label
                          htmlFor="pdf-upload"
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          PDFファイルを選択
                        </label>
                      </div>
                    )}

                    {/* 結果表示 */}
                    {result && (
                      <div className="space-y-4">
                        {result.error ? (
                          <Card className="border-red-200 bg-red-50">
                            <CardHeader>
                              <CardTitle className="text-red-700 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                {result.isImagePDF ? '画像ベースPDFを検出' : 'PDF処理エラー'}
                              </CardTitle>
                              {result.helpMessage && (
                                <CardDescription className="text-red-600">
                                  {result.helpMessage}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <p className="text-red-600 font-medium">{result.error}</p>
                                
                                {result.details && Array.isArray(result.details) && result.details.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-red-700">詳細情報:</h4>
                                    <ul className="space-y-1 text-sm text-red-600">
                                      {result.details.map((detail, index) => (
                                        <li key={index} className={
                                          detail.startsWith('1.') || detail.startsWith('2.') || detail.startsWith('3.') || detail.startsWith('•')
                                            ? 'ml-3'
                                            : ''
                                        }>
                                          {detail}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {result.isImagePDF && (
                                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="text-sm font-medium text-blue-700 mb-2">
                                      楽天カードCSVダウンロード方法:
                                    </h4>
                                    <ol className="text-xs text-blue-600 space-y-1 ml-4">
                                      <li>1. 楽天カード会員サイト「楽天e-NAVI」にログイン</li>
                                      <li>2. 「明細確認」→「利用明細」を選択</li>
                                      <li>3. 期間を指定し「CSVダウンロード」をクリック</li>
                                      <li>4. ダウンロードしたCSVファイルをこのサイトで取り込み</li>
                                    </ol>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
                            <CardHeader>
                              <CardTitle className="text-emerald-700 dark:text-emerald-300">処理完了</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <p className="text-emerald-700 dark:text-emerald-300">
                                  <strong>{result.summary.total}</strong>件の取引を検出しました
                                </p>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                  新規: {result.summary.unique}件 | 重複: {result.summary.duplicates}件
                                </p>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                  処理方法: {result.summary.processingMethod}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 対応予定のお知らせ */}
              <Card>
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">今後の機能追加予定</CardTitle>
                  <CardDescription>
                    PDF機能のさらなる強化について
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Camera className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-blue-800">OCR機能強化</h3>
                        </div>
                        <ul className="space-y-1 text-sm text-gray-600">
                          <li>• より高精度な文字認識</li>
                          <li>• 手書き明細への対応</li>
                          <li>• スキャン画像の自動補正</li>
                        </ul>
                      </div>
                      <div className="p-4 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Smartphone className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-blue-800">スマホ対応強化</h3>
                        </div>
                        <ul className="space-y-1 text-sm text-gray-600">
                          <li>• カメラ撮影からの直接取り込み</li>
                          <li>• リアルタイムプレビュー</li>
                          <li>• 自動トリミング機能</li>
                        </ul>
                      </div>
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
              <Button variant="outline" asChild className="mb-4">
                <Link href="/import">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  戻る
                </Link>
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mb-2">PDF明細インポート</h1>
              <p className="text-muted-foreground">クレジットカード、銀行明細などのPDFファイルをインポート</p>
            </div>

            {/* モバイル向けPDF機能 */}
            <Card className="border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-purple-50 dark:from-cyan-950 dark:to-purple-950 mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  PDFファイルをアップロード
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processing.isProcessing ? (
                    <div className="border border-cyan-300 dark:border-cyan-600 rounded-lg p-4 text-center bg-gradient-to-br from-cyan-50 to-purple-50 dark:from-cyan-950 dark:to-purple-950">
                      <Loader2 className="h-8 w-8 text-cyan-500 mx-auto mb-2 animate-spin" />
                      <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-1">処理中...</p>
                      <p className="text-xs text-gray-600 mb-1">{processing.fileName}</p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400">{processing.progress}</p>
                    </div>
                  ) : (
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                        dragOver 
                          ? 'border-cyan-400 bg-gradient-to-br from-cyan-100 to-purple-100 dark:from-cyan-900 dark:to-purple-900' 
                          : 'border-cyan-300 dark:border-cyan-600'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <FileText className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-2">
                        PDFファイルを選択
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        id="pdf-upload-mobile"
                        onChange={handleFileInputChange}
                      />
                      <label
                        htmlFor="pdf-upload-mobile"
                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg text-sm cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <Upload className="mr-1 h-3 w-3" />
                        ファイルを選択
                      </label>
                    </div>
                  )}

                  {/* モバイル結果表示 */}
                  {result && (
                    <div className="space-y-2">
                      {result.error ? (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <p className="text-sm font-medium text-red-600">
                              {result.isImagePDF ? '画像ベースPDF検出' : 'PDF処理エラー'}
                            </p>
                          </div>
                          <p className="text-sm text-red-600">{result.error}</p>
                          {result.helpMessage && (
                            <p className="text-xs text-red-500 mt-2">{result.helpMessage}</p>
                          )}
                          {result.isImagePDF && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-xs font-medium text-blue-700 mb-1">CSV取得手順:</p>
                              <p className="text-xs text-blue-600">楽天e-NAVI → 明細確認 → CSVダウンロード</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                            {result.summary.total}件の取引を検出
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            新規: {result.summary.unique}件 | 重複: {result.summary.duplicates}件
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 今後の対応予定（簡略版） */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">今後の機能追加予定</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-blue-600" />
                    高精度OCR機能
                  </li>
                  <li className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                    カメラ撮影対応
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    主要カード・銀行対応
                  </li>
                </ul>
              </CardContent>
            </Card>
          </main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}