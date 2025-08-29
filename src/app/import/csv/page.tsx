'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { supabase } from '@/lib/supabase/client';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

interface ImportedTransaction {
  date: string;
  amount: number;
  description: string;
  category?: string;
  categoryType?: 'revenue' | 'expense';
  confidence?: number;
  isBusiness?: boolean;
  originalData: any;
  processingMethod?: string;
  categoryId?: string | null;
}

interface AccountCategory {
  id: string;
  name: string;
  category_type: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity';
}

export default function CSVImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<ImportedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);
  const [accountCategories, setAccountCategories] = useState<AccountCategory[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [customRules, setCustomRules] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // カスタムルールを取得
  useEffect(() => {
    const loadCustomRules = () => {
      try {
        const saved = localStorage.getItem('customClassificationRules');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCustomRules(parsed.filter((rule: any) => rule.enabled));
          console.log('📋 カスタムルール読み込み完了:', parsed.length, '件');
        }
      } catch (error) {
        console.error('カスタムルール読み込みエラー:', error);
      }
    };
    
    loadCustomRules();
  }, []);

  // 勘定科目一覧を取得
  useEffect(() => {
    const fetchAccountCategories = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/account-categories', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const { categories } = await response.json();
          setAccountCategories(categories);
        }
      } catch (error) {
        console.error('勘定科目取得エラー:', error);
      }
    };

    fetchAccountCategories();
  }, []);

  // チェックボックス関連の処理
  const toggleTransactionSelection = (index: number) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTransactions(newSelected);
  };

  const selectAllTransactions = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(importedData.map((_, index) => index)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  // 勘定科目変更の処理
  const updateTransactionCategory = (index: number, categoryId: string, categoryName: string, categoryType: 'revenue' | 'expense') => {
    const updatedData = [...importedData];
    updatedData[index] = {
      ...updatedData[index],
      category: categoryName,
      categoryId,
      categoryType
    };
    setImportedData(updatedData);
  };

  const bulkUpdateCategories = () => {
    if (!bulkCategory || selectedTransactions.size === 0) return;

    const selectedCategory = accountCategories.find(cat => cat.id === bulkCategory);
    if (!selectedCategory) return;

    const updatedData = [...importedData];
    selectedTransactions.forEach(index => {
      updatedData[index] = {
        ...updatedData[index],
        category: selectedCategory.name,
        categoryId: selectedCategory.id,
        categoryType: selectedCategory.category_type === 'revenue' ? 'revenue' : 'expense'
      };
    });

    setImportedData(updatedData);
    setSelectedTransactions(new Set());
    setBulkCategory('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setError(null);
      setSummary(null);
      setImportedData([]);
      setSelectedTransactions(new Set());
      setIsEditMode(false);
      console.log('📁 CSVファイル選択:', file.name);
    } else {
      setError('CSVファイルを選択してください');
      setSelectedFile(null);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportedData([]);
    setError(null);
    setSummary(null);
    setSelectedTransactions(new Set());
    setIsEditMode(false);
    setProcessingStatus('');
    console.log('🔄 インポート状態をリセット');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setError(null);
      setSummary(null);
      setImportedData([]);
      setSelectedTransactions(new Set());
      setIsEditMode(false);
      console.log('📁 CSVファイルドロップ:', file.name);
    } else {
      setError('CSVファイルをドロップしてください');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // currentTargetとtargetが異なる場合のみドラッグ離脱とみなす
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setProcessingStatus('CSVファイルを解析中...');

    try {
      // 認証セッションを取得
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('ログインが必要です。ログインしてください。');
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'CSVファイルの処理中にエラーが発生しました');
      }

      const result = await response.json();
      console.log('📊 CSVインポート結果:', result);
      
      if (result.transactions && result.transactions.length > 0) {
        // カスタムルールを適用
        const enhancedTransactions = result.transactions.map((transaction: ImportedTransaction) => {
          // カスタムルールをチェック
          for (const rule of customRules) {
            if (transaction.description.toLowerCase().includes(rule.keyword.toLowerCase())) {
              console.log(`🎯 カスタムルール適用: "${transaction.description}" → ${rule.category} (${rule.isBusiness ? '事業' : '個人'})`);
              return {
                ...transaction,
                category: rule.category,
                isBusiness: rule.isBusiness,
                confidence: 1.0, // カスタムルールは最高精度
                categoryType: 'expense' // 簡単のため全て支出として扱う
              };
            }
          }
          return transaction;
        });
        
        setImportedData(enhancedTransactions);
        setSummary(result.summary);
        console.log('✅ CSVデータ設定完了:', enhancedTransactions.length, '件（カスタムルール適用済み）');
      } else {
        console.warn('⚠️ 取引データが空です:', result);
        setError('取引データが見つかりませんでした。');
      }
      setProcessingStatus('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTransactions = async () => {
    if (importedData.length === 0) return;

    setIsProcessing(true);
    try {
      // 認証セッションを取得
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('ログインが必要です。ログインしてください。');
        setIsProcessing(false);
        return;
      }

      const response = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ transactions: importedData }),
      });

      if (!response.ok) {
        throw new Error('取引データの保存中にエラーが発生しました');
      }

      // 保存成功時の処理
      alert('取引データを保存しました');
      setImportedData([]);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
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
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-green-700">
                      CSV明細インポート
                    </h1>
                    <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mt-1"></div>
                  </div>
                </div>
                <p className="text-gray-600 text-lg">
                  💳 CSVファイルを高精度で処理します
                </p>
              </div>

              {/* ファイルアップロードエリア */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    CSVファイルアップロード
                  </CardTitle>
                  <CardDescription>
                    楽天カード、三井住友カード、銀行明細などのCSVファイルに対応
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                      isDragOver 
                        ? 'border-green-500 bg-green-100 scale-105 shadow-lg' 
                        : 'border-green-300 hover:border-green-400 hover:bg-green-50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="space-y-2">
                        <p className={`text-xl font-semibold ${isDragOver ? 'text-green-800' : 'text-green-700'}`}>
                          {isDragOver ? '🎯 ファイルをここにドロップ！' : '📂 CSVファイルをドラッグ&ドロップ'}
                        </p>
                        <p className={`${isDragOver ? 'text-green-700' : 'text-green-600'}`}>
                          {isDragOver ? 'CSVファイルを放してください' : 'または下のボタンから選択'}
                        </p>
                      </div>
                      <label className="cursor-pointer">
                        <Button className="bg-green-500 hover:bg-green-600 text-white">
                          📎 CSVファイルを選択
                        </Button>
                        <input
                          type="file"
                          accept=".csv"
                          className="sr-only"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                        <div className="flex-1">
                          <p className="font-semibold text-green-700">
                            ✅ {selectedFile.name}
                          </p>
                          <p className="text-green-600 text-sm">
                            📊 サイズ: {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {processingStatus && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-blue-800 font-medium">{processingStatus}</p>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <p className="text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="mt-6 flex gap-2">
                    <Button
                      onClick={processFile}
                      disabled={!selectedFile || isProcessing}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          🔄 解析中...
                        </span>
                      ) : (
                        '⚡ CSVファイルを解析'
                      )}
                    </Button>
                    <Button
                      onClick={resetImport}
                      variant="outline"
                      disabled={isProcessing}
                    >
                      🔄 リセット
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* インポートプレビュー */}
              {importedData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700">
                      インポートプレビュー
                    </CardTitle>
                    <CardDescription>
                      🎯 {importedData.length}件のCSV取引データを検出しました
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* 編集コントロール */}
                    <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditMode(!isEditMode)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        {isEditMode ? '編集完了' : '勘定科目を編集'}
                      </Button>
                      
                      {isEditMode && (
                        <>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="select-all"
                              checked={selectedTransactions.size === importedData.length}
                              onCheckedChange={selectAllTransactions}
                            />
                            <label htmlFor="select-all" className="text-sm">
                              全選択 ({selectedTransactions.size}件選択中)
                            </label>
                          </div>
                          
                          {selectedTransactions.size > 0 && (
                            <div className="flex items-center gap-2">
                              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="勘定科目を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accountCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={bulkUpdateCategories}
                                disabled={!bulkCategory}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                一括変更
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {importedData.slice(0, 10).map((transaction, index) => (
                        <div
                          key={index}
                          className={`border rounded-xl p-4 transition-all hover:shadow-md ${
                            transaction.confidence && transaction.confidence < 0.6 
                              ? 'border-orange-300 bg-orange-50' 
                              : 'border-gray-200 bg-white'
                          } ${selectedTransactions.has(index) ? 'ring-2 ring-green-300' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-4">
                            {isEditMode && (
                              <div className="flex-shrink-0 pt-1">
                                <Checkbox
                                  checked={selectedTransactions.has(index)}
                                  onCheckedChange={() => toggleTransactionSelection(index)}
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium text-gray-900 truncate">
                                  {transaction.description}
                                </p>
                                {transaction.confidence && transaction.confidence < 0.6 && (
                                  <span className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded-full">
                                    要確認
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span>📅 {transaction.date}</span>
                                
                                {isEditMode ? (
                                  <Select 
                                    value={transaction.categoryId || ''} 
                                    onValueChange={(categoryId) => {
                                      const category = accountCategories.find(cat => cat.id === categoryId);
                                      if (category) {
                                        updateTransactionCategory(
                                          index, 
                                          categoryId, 
                                          category.name, 
                                          category.category_type === 'revenue' ? 'revenue' : 'expense'
                                        );
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-40 h-7 text-xs">
                                      <SelectValue placeholder="選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accountCategories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    transaction.categoryType === 'expense' 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {transaction.category || '未分類'}
                                  </span>
                                )}
                                
                                {transaction.confidence && (
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    transaction.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                                    transaction.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {Math.round(transaction.confidence * 100)}%
                                  </span>
                                )}
                                
                                {transaction.isBusiness && (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    💼 事業用
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right flex-shrink-0">
                              <p className={`text-lg font-bold ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.amount > 0 ? '+' : ''}
                                ¥{Math.abs(transaction.amount).toLocaleString()}
                              </p>
                              <p className={`text-xs font-medium ${
                                transaction.categoryType === 'expense' ? 'text-red-500' : 'text-green-500'
                              }`}>
                                {transaction.categoryType === 'expense' ? '💸 支出' : '💰 収入'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {importedData.length > 10 && (
                        <p className="text-center text-gray-500 py-2">
                          他 {importedData.length - 10} 件...
                        </p>
                      )}
                    </div>

                    <div className="mt-8 flex gap-4">
                      <Button
                        onClick={saveTransactions}
                        disabled={isProcessing}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            💾 保存中...
                          </span>
                        ) : (
                          '💾 取引データを保存'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportedData([]);
                          setSelectedFile(null);
                        }}
                      >
                        ❌ キャンセル
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
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
              <h1 className="text-2xl font-bold text-green-700 mb-2">CSV明細インポート</h1>
              <p className="text-muted-foreground">CSVファイルを選択してください</p>
            </div>
            
            {/* モバイル版の簡略化されたUI */}
            <Card>
              <CardHeader>
                <CardTitle>ファイル選択</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="cursor-pointer">
                  <Button className="w-full bg-green-500 hover:bg-green-600">
                    📎 CSVファイルを選択
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
                {selectedFile && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ {selectedFile.name}
                  </p>
                )}
                {selectedFile && (
                  <Button
                    onClick={processFile}
                    disabled={isProcessing}
                    className="w-full mt-4 bg-green-500 hover:bg-green-600"
                  >
                    {isProcessing ? '解析中...' : 'ファイルを解析'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}