'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReceiptUpload } from '@/components/receipts/receipt-upload';
import { Calculator, Camera, FileText, Calendar, Tag, Building2, User, Eye, Edit2, Check, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ReceiptOCR } from '@/lib/ocr/vision-api';
import { autoClassifyReceipt } from '@/lib/utils/receipt-classifier';
import { classifyWithAI } from '@/lib/classification/huggingface-classifier';
import { classifyWithOpenAI, setOpenAIApiKey } from '@/lib/classification/openai-classifier';

interface ExtractedData {
  amount?: number;
  description?: string;
  date?: string;
  merchantName?: string;
  category?: string;
  confidence?: number;
}

interface Receipt {
  id: string;
  filename: string;
  upload_date: string;
  ocr_text: string;
  extracted_data: ExtractedData;
  is_processed: boolean;
  transaction_id?: string;
}

export default function ReceiptsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [processingUpload, setProcessingUpload] = useState(false);
  const [editingField, setEditingField] = useState<{receiptId: string, field: string} | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: string}>({});
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      console.log('User not authenticated, redirecting...'); // デバッグログ
      // 一時的に認証チェックを無効化（テスト用）
      // router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user]);

  const fetchReceipts = async () => {
    if (!user) return;

    try {
      setLoadingReceipts(true);
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoadingReceipts(false);
    }
  };

  const saveReceiptToDatabase = async (
    imageBase64: string,
    fileName: string,
    ocrText: string,
    extractedData: any
  ) => {
    if (!user) {
      console.log('No user - cannot save to database');
      return;
    }

    try {
      // AI分類とキーワード分類のハイブリッド実行
      let classificationResult = null;
      if (extractedData.amount && extractedData.amount > 0) {
        console.log('🤖 ハイブリッドAI分類を試行中...');
        
        // 1. OpenAI分類を優先試行（高精度）
        let openaiResult = null;
        try {
          openaiResult = await classifyWithOpenAI(
            extractedData.description || '',
            extractedData.amount,
            extractedData.merchantName,
            ocrText
          );
          if (openaiResult && openaiResult.confidence > 0.8) {
            classificationResult = openaiResult;
            console.log('🎆 OpenAI分類成功(高精度):', classificationResult);
          }
        } catch (error) {
          console.log('⚠️ OpenAI分類スキップ:', error);
        }
        
        // 2. OpenAIが失敗/低精度ならHugging Faceを試行
        if (!classificationResult) {
          const aiResult = await classifyWithAI(
            extractedData.description || '',
            extractedData.amount,
            extractedData.merchantName,
            ocrText
          );
          
          if (aiResult && aiResult.confidence > 0.6) {
            classificationResult = aiResult;
            console.log('🤖 Hugging Face分類成功:', classificationResult);
          }
        }
        
        // 3. 両方のAIが低精度ならキーワード分類を併用
        if (!classificationResult || classificationResult.confidence < 0.6) {
          const keywordResult = autoClassifyReceipt(
            extractedData.description || '',
            extractedData.amount,
            extractedData.merchantName,
            ocrText
          );
          
          // 最も信頼度の高い結果を採用
          const candidates = [classificationResult, keywordResult, openaiResult].filter(Boolean);
          if (candidates.length > 0) {
            classificationResult = candidates.reduce((best, current) => 
              current.confidence > best.confidence ? current : best
            );
            console.log('🔑 最高信頼度結果採用:', classificationResult);
          }
        }
        
        console.log('🎯 最終分類結果:', classificationResult);
      }

      // レシートデータをDBに保存（分類結果も含める）
      const receiptDataToSave = {
        ...extractedData,
        classification: classificationResult ? {
          categoryId: classificationResult.categoryId,
          categoryName: classificationResult.categoryName,
          confidence: classificationResult.confidence,
          isBusiness: classificationResult.isBusiness,
          reasoning: classificationResult.reasoning,
          matchedKeywords: classificationResult.matchedKeywords
        } : null
      };

      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          filename: fileName,
          original_filename: fileName,
          ocr_text: ocrText,
          extracted_data: receiptDataToSave,
          upload_date: new Date().toISOString()
        })
        .select()
        .single();

      if (receiptError) throw receiptError;
      
      console.log('Receipt saved to database:', receiptData);
      
      // 抽出されたデータがある場合、取引として保存（分類結果を活用）
      // 一時的に無効化してレシート保存のみテスト
      if (false && extractedData.amount && extractedData.amount > 0) {
        const transactionData = {
          user_id: user.id,
          account_id: '00000000-0000-0000-0000-000000000000', // デフォルト口座ID（後で修正予定）
          amount: extractedData.amount,
          description: extractedData.description || 'レシートからの取引',
          transaction_date: extractedData.date || new Date().toISOString().split('T')[0],
          category: classificationResult ? classificationResult.categoryName : 'その他',
          is_business: classificationResult ? classificationResult.isBusiness : true
        };

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert(transactionData);

        if (transactionError) {
          console.error('Transaction save error:', transactionError);
          console.error('Transaction data that failed:', transactionData);
        } else {
          console.log('Transaction created from receipt with classification:', {
            amount: extractedData.amount,
            category: classificationResult?.categoryName,
            confidence: classificationResult?.confidence,
            isBusiness: classificationResult?.isBusiness
          });
        }
      }
    } catch (error) {
      console.error('Database save error:', error);
      throw error;
    }
  };

  const handleReceiptUpload = async (files: File[]) => {
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    if (files.length === 0) return;

    try {
      setProcessingUpload(true);
      
      console.log(`Starting batch processing of ${files.length} receipts...`);

      // API設定
      const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY;
      const apiKey = geminiApiKey || googleApiKey;
      
      console.log('Gemini API Key available:', !!geminiApiKey);
      console.log('Google Vision API Key available:', !!googleApiKey);
      
      if (!apiKey) {
        console.error('No API key configured');
        alert('APIキーが設定されていません');
        return;
      }

      const useGemini = !!geminiApiKey;
      const receiptOCR = new ReceiptOCR(apiKey, useGemini);
      
      const results: Array<{file: File, success: boolean, data?: any, error?: string}> = [];
      
      // 各ファイルを順次処理
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        
        try {
          // ファイル名生成
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

          // Base64変換
          const imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // OCR処理
          console.log(`OCR processing file: ${file.name}`);
          const result = await receiptOCR.processReceipt(imageBase64);
          const { ocrText, extractedData } = result;
          
          // 複数レシートが検出された場合
          if ((result as any).multipleReceipts && (result as any).multipleReceipts.length > 1) {
            console.log(`📄 ${file.name}に${(result as any).totalCount}枚のレシートを検出`);
            
            // 各レシートを個別に保存
            for (let j = 0; j < (result as any).multipleReceipts.length; j++) {
              const receiptData = (result as any).multipleReceipts[j];
              const subFileName = `${user.id}/${Date.now()}_${i}_receipt_${j + 1}.${fileExt}`;
              
              await saveReceiptToDatabase(imageBase64, subFileName, ocrText, receiptData);
              console.log(`  ✓ レシート${j + 1}: ${receiptData.merchantName || 'unknown'} - ¥${receiptData.amount}`);
            }
            
            results.push({
              file,
              success: true,
              data: { 
                ocrText, 
                extractedData,
                multipleCount: (result as any).totalCount,
                receipts: (result as any).multipleReceipts
              }
            });
            
            console.log(`✓ Successfully processed: ${file.name} - ${(result as any).totalCount}枚のレシート`);
          } else {
            // 単一レシートの場合
            await saveReceiptToDatabase(imageBase64, fileName, ocrText, extractedData);
            
            results.push({
              file,
              success: true,
              data: { ocrText, extractedData }
            });
            
            console.log(`✓ Successfully processed: ${file.name} - ¥${extractedData.amount}`);
          }
          
        } catch (error) {
          console.error(`✗ Failed to process ${file.name}:`, error);
          results.push({
            file,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        // 短い待機時間（API制限対応）
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // 結果表示
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      let message = `バッチ処理完了!\n成功: ${successCount}枚\n失敗: ${failureCount}枚\n\n`;
      
      // 成功した結果の詳細
      const successResults = results.filter(r => r.success);
      if (successResults.length > 0) {
        message += '処理済みレシート:\n';
        successResults.forEach((result, index) => {
          if (result.data?.multipleCount && result.data?.receipts) {
            // 複数レシートの場合
            message += `${index + 1}. ${result.file.name} (${result.data.multipleCount}枚):\n`;
            result.data.receipts.forEach((receipt: any, rIndex: number) => {
              message += `  ${rIndex + 1}. ${receipt.merchantName || 'レシート'} - ¥${receipt.amount}\n`;
            });
          } else {
            // 単一レシートの場合
            const amount = result.data?.extractedData?.amount;
            const description = result.data?.extractedData?.description || result.file.name;
            message += `${index + 1}. ${description} - ¥${amount}\n`;
          }
        });
      }
      
      // 失敗した結果
      const failureResults = results.filter(r => !r.success);
      if (failureResults.length > 0) {
        message += '\n失敗したファイル:\n';
        failureResults.forEach((result, index) => {
          message += `${index + 1}. ${result.file.name}: ${result.error}\n`;
        });
      }
      
      alert(message);
      
      // レシート一覧を更新
      await fetchReceipts();
      
      console.log(`Batch processing completed. Success: ${successCount}, Failed: ${failureCount}`);
      
    } catch (error) {
      console.error('Batch processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`バッチ処理でエラーが発生しました:\n${errorMessage}`);
      throw error;
    } finally {
      setProcessingUpload(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const startEditing = (receiptId: string, field: string, currentValue: any) => {
    setEditingField({receiptId, field});
    const key = `${receiptId}_${field}`;
    setEditValues({...editValues, [key]: currentValue?.toString() || ''});
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValues({});
  };

  const updateEditValue = (value: string) => {
    if (!editingField) return;
    const key = `${editingField.receiptId}_${editingField.field}`;
    setEditValues({...editValues, [key]: value});
  };

  const getEditValue = (receiptId: string, field: string) => {
    const key = `${receiptId}_${field}`;
    return editValues[key] || '';
  };

  const saveField = async (receiptId: string, field: string) => {
    if (!editingField) return;
    
    const newValue = getEditValue(receiptId, field);
    const currentReceipt = receipts.find(r => r.id === receiptId);
    if (!currentReceipt) return;

    // バリデーション
    let processedValue: any = newValue;
    if (field === 'amount') {
      processedValue = parseFloat(newValue);
      if (isNaN(processedValue) || processedValue < 0) {
        alert('有効な金額を入力してください');
        return;
      }
    } else if (field === 'date') {
      // 日付形式チェック
      if (newValue && !newValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        alert('日付はYYYY-MM-DD形式で入力してください');
        return;
      }
    }

    try {
      const updatedData = {
        ...currentReceipt.extracted_data,
        [field]: processedValue
      };

      const { error } = await supabase
        .from('receipts')
        .update({
          extracted_data: updatedData
        })
        .eq('id', receiptId);

      if (error) throw error;

      // ローカル状態を更新
      setReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId 
          ? { ...receipt, extracted_data: updatedData }
          : receipt
      ));

      cancelEditing();
      console.log(`${field} updated for receipt ${receiptId}: ${processedValue}`);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert(`${field === 'amount' ? '金額' : field === 'description' ? '説明' : field === 'merchantName' ? '店舗名' : field === 'date' ? '日付' : field}の更新に失敗しました`);
    }
  };

  const createTransactionFromReceipt = async (receipt: Receipt) => {
    if (!receipt.extracted_data.amount || !receipt.extracted_data.description) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user!.id,
            amount: receipt.extracted_data.amount,
            description: receipt.extracted_data.description,
            transaction_date: receipt.extracted_data.date || new Date().toISOString().split('T')[0],
            is_business: false, // デフォルト個人用
            transaction_type: 'expense'
          }
        ]);

      if (error) throw error;

      // レシートを処理済みに更新
      await supabase
        .from('receipts')
        .update({ transaction_id: 'created' })
        .eq('id', receipt.id);

      fetchReceipts();
      alert('取引を作成しました');
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('取引の作成に失敗しました');
    }
  };

  const deleteReceipt = async (receiptId: string) => {
    if (!user) return;

    // 確認ダイアログ
    if (!confirm('このレシートを削除しますか？\nこの操作は取り消せません。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId)
        .eq('user_id', user.id);

      if (error) throw error;

      // ローカル状態から削除
      setReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
      
      console.log(`Receipt deleted: ${receiptId}`);
      alert('レシートを削除しました');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('レシートの削除に失敗しました');
    }
  };

  const toggleReceiptSelection = (receiptId: string) => {
    setSelectedReceipts(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(receiptId)) {
        newSelected.delete(receiptId);
      } else {
        newSelected.add(receiptId);
      }
      return newSelected;
    });
  };

  const selectAllReceipts = () => {
    setSelectedReceipts(new Set(receipts.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedReceipts(new Set());
    setIsSelectionMode(false);
  };

  const reclassifyReceipt = async (receiptId: string) => {
    if (!user) return;
    
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt || !receipt.extracted_data.amount) return;

    try {
      // AIハイブリッド再分類実行
      const debugInfo = {
        description: receipt.extracted_data.description,
        merchantName: receipt.extracted_data.merchantName,
        amount: receipt.extracted_data.amount,
        ocrText: receipt.ocr_text?.substring(0, 200)
      };
      console.log('🔄 再分類実行:', debugInfo);
      
      // キーワード検索用テキストを表示
      const searchText = `${receipt.extracted_data.description || ''} ${receipt.extracted_data.merchantName || ''} ${receipt.ocr_text || ''}`.toLowerCase();
      console.log('🔍 キーワード検索対象:', searchText.substring(0, 300));
      
      // エナジードリンクキーワードチェック
      const energyKeywords = ['エナジー', 'energy', 'レッドブル', 'redbull', 'モンスター', 'monster', 'リポビタン'];
      const foundEnergyKeywords = energyKeywords.filter(keyword => searchText.includes(keyword));
      if (foundEnergyKeywords.length > 0) {
        console.log('⚡ エナジードリンクキーワード検出:', foundEnergyKeywords);
      } else {
        console.log('⚠️ エナジードリンクキーワードが見つかりません');
      }
      
      // AI分類を優先して試行
      let classificationResult = await classifyWithAI(
        receipt.extracted_data.description || '',
        receipt.extracted_data.amount,
        receipt.extracted_data.merchantName,
        receipt.ocr_text
      );
      
      // AI分類が低信頼度の場合、キーワード分類を併用
      if (!classificationResult || classificationResult.confidence < 0.6) {
        const keywordResult = autoClassifyReceipt(
          receipt.extracted_data.description || '',
          receipt.extracted_data.amount,
          receipt.extracted_data.merchantName,
          receipt.ocr_text
        );
        
        if (keywordResult && (!classificationResult || keywordResult.confidence > classificationResult.confidence)) {
          classificationResult = keywordResult;
        }
      }

      if (classificationResult) {
        const updatedData = {
          ...receipt.extracted_data,
          classification: {
            categoryId: classificationResult.categoryId,
            categoryName: classificationResult.categoryName,
            confidence: classificationResult.confidence,
            isBusiness: classificationResult.isBusiness,
            reasoning: classificationResult.reasoning,
            matchedKeywords: classificationResult.matchedKeywords
          }
        };

        const { error } = await supabase
          .from('receipts')
          .update({ extracted_data: updatedData })
          .eq('id', receiptId);

        if (error) throw error;

        // ローカル状態を更新
        setReceipts(prev => prev.map(r => 
          r.id === receiptId ? { ...r, extracted_data: updatedData } : r
        ));

        console.log('Receipt reclassified:', classificationResult);
      }
    } catch (error) {
      console.error('Error reclassifying receipt:', error);
      alert('再分類に失敗しました');
    }
  };

  const deleteSelectedReceipts = async () => {
    if (!user || selectedReceipts.size === 0) return;

    const count = selectedReceipts.size;
    if (!confirm(`選択した${count}件のレシートを削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const receiptIds = Array.from(selectedReceipts);
      
      const { error } = await supabase
        .from('receipts')
        .delete()
        .in('id', receiptIds)
        .eq('user_id', user.id);

      if (error) throw error;

      // ローカル状態から削除
      setReceipts(prev => prev.filter(receipt => !selectedReceipts.has(receipt.id)));
      
      console.log(`${count} receipts deleted:`, receiptIds);
      alert(`${count}件のレシートを削除しました`);
      
      // 選択状態をクリア
      clearSelection();
    } catch (error) {
      console.error('Error deleting receipts:', error);
      alert('レシートの削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Calculator className="h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 一時的に認証チェックを無効化（テスト用）
  // if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">レシート管理</h1>
                <p className="text-muted-foreground">レシートをアップロードしてOCRで自動取引作成</p>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* アップロードエリア */}
                <div>
                  <ReceiptUpload 
                    onUpload={handleReceiptUpload} 
                    isProcessing={processingUpload}
                  />
                </div>

                {/* レシート一覧 */}
                <div>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>最近のレシート</CardTitle>
                        <div className="flex items-center gap-2">
                          {!isSelectionMode ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsSelectionMode(true)}
                                className="text-xs"
                              >
                                選択モード
                              </Button>
                              {/* OpenAI APIキー設定 */}
                              <div className="flex items-center gap-1">
                                <Input
                                  type="password"
                                  placeholder="OpenAI API Key"
                                  value={openaiApiKey}
                                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                                  className="w-32 h-6 text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (openaiApiKey) {
                                      setOpenAIApiKey(openaiApiKey);
                                      alert('OpenAI APIキーを設定しました');
                                    } else {
                                      alert('テスト用ダミーキーでスキップします');
                                    }
                                  }}
                                  className="text-xs h-6 px-2"
                                  title="APIキーを入力するか、空欄でテストモード"
                                >
                                  {openaiApiKey ? '設定' : 'テスト'}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={selectAllReceipts}
                                className="text-xs"
                              >
                                全選択
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={clearSelection}
                                className="text-xs"
                              >
                                キャンセル
                              </Button>
                              {selectedReceipts.size > 0 && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={deleteSelectedReceipts}
                                  className="text-xs"
                                >
                                  削除 ({selectedReceipts.size})
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingReceipts ? (
                        <div className="text-center py-8">
                          <Calculator className="h-8 w-8 mx-auto mb-4 animate-spin" />
                          <p className="text-muted-foreground">読み込み中...</p>
                        </div>
                      ) : receipts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">レシートがありません</p>
                          <p className="text-sm">左側からレシートをアップロードしてください</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {receipts.map((receipt) => (
                            <div
                              key={receipt.id}
                              className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                                selectedReceipts.has(receipt.id) ? 'bg-blue-50 border-blue-300' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                {isSelectionMode && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleReceiptSelection(receipt.id)}
                                    className="h-6 w-6 p-0 mr-2 flex-shrink-0"
                                  >
                                    {selectedReceipts.has(receipt.id) ? (
                                      <CheckSquare className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
                                  <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <span className="font-medium text-sm break-words leading-tight">
                                    {receipt.original_filename || receipt.filename}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(receipt.upload_date)}
                                  </div>
                                  {!isSelectionMode && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteReceipt(receipt.id)}
                                      className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                                      title="レシートを削除"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {receipt.extracted_data && (
                                <div className="space-y-2 mb-3">
                                  {/* 分類情報の表示 */}
                                  {receipt.extracted_data.classification && (
                                    <div className="flex items-center justify-between text-sm p-2 bg-blue-50 rounded">
                                      <div className="flex items-center gap-2">
                                        <Tag className="h-3 w-3 text-blue-600" />
                                        <span className="text-blue-800 font-medium">
                                          {receipt.extracted_data.classification.categoryName}
                                        </span>
                                        {receipt.extracted_data.classification.isBusiness && (
                                          <span className="text-xs bg-green-100 text-green-700 px-1 rounded">事業用</span>
                                        )}
                                      </div>
                                      <span className="text-xs text-blue-600">
                                        信頼度: {Math.round(receipt.extracted_data.classification.confidence * 100)}%
                                      </span>
                                    </div>
                                  )}
                                  {receipt.extracted_data.amount && (
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        <Tag className="h-3 w-3 text-green-600" />
                                        <span className="text-muted-foreground">金額</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {editingField?.receiptId === receipt.id && editingField?.field === 'amount' ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="number"
                                              value={getEditValue(receipt.id, 'amount')}
                                              onChange={(e) => updateEditValue(e.target.value)}
                                              className="w-24 h-6 text-sm text-right"
                                              autoFocus
                                            />
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => saveField(receipt.id, 'amount')}
                                              className="h-6 w-6 p-0"
                                            >
                                              <Check className="h-3 w-3 text-green-600" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={cancelEditing}
                                              className="h-6 w-6 p-0"
                                            >
                                              <X className="h-3 w-3 text-red-600" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-green-600">
                                              {formatCurrency(receipt.extracted_data.amount)}
                                            </span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => startEditing(receipt.id, 'amount', receipt.extracted_data.amount)}
                                              className="h-6 w-6 p-0 hover:bg-muted"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 説明 */}
                                  <div className="flex items-center gap-2 text-sm">
                                    <FileText className="h-3 w-3 text-blue-600" />
                                    {editingField?.receiptId === receipt.id && editingField?.field === 'description' ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input
                                          type="text"
                                          value={getEditValue(receipt.id, 'description')}
                                          onChange={(e) => updateEditValue(e.target.value)}
                                          className="flex-1 h-6 text-sm"
                                          placeholder="説明を入力"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => saveField(receipt.id, 'description')}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Check className="h-3 w-3 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={cancelEditing}
                                          className="h-6 w-6 p-0"
                                        >
                                          <X className="h-3 w-3 text-red-600" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2 flex-1">
                                        <span className="text-muted-foreground flex-1 break-words leading-tight">
                                          {receipt.extracted_data.description || '説明なし'}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => startEditing(receipt.id, 'description', receipt.extracted_data.description)}
                                          className="h-6 w-6 p-0 hover:bg-muted flex-shrink-0"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  {/* 店舗名 */}
                                  <div className="flex items-center gap-2 text-xs">
                                    <Building2 className="h-3 w-3 text-purple-600" />
                                    {editingField?.receiptId === receipt.id && editingField?.field === 'merchantName' ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input
                                          type="text"
                                          value={getEditValue(receipt.id, 'merchantName')}
                                          onChange={(e) => updateEditValue(e.target.value)}
                                          className="flex-1 h-6 text-xs"
                                          placeholder="店舗名を入力"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => saveField(receipt.id, 'merchantName')}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Check className="h-2 w-2 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={cancelEditing}
                                          className="h-6 w-6 p-0"
                                        >
                                          <X className="h-2 w-2 text-red-600" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2 flex-1">
                                        <span className="text-muted-foreground flex-1 break-words leading-tight">
                                          店舗: {receipt.extracted_data.merchantName || '未設定'}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => startEditing(receipt.id, 'merchantName', receipt.extracted_data.merchantName)}
                                          className="h-6 w-6 p-0 hover:bg-muted flex-shrink-0"
                                        >
                                          <Edit2 className="h-2 w-2" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  {/* 日付 */}
                                  <div className="flex items-center gap-2 text-xs">
                                    <Calendar className="h-3 w-3 text-orange-600" />
                                    {editingField?.receiptId === receipt.id && editingField?.field === 'date' ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input
                                          type="date"
                                          value={getEditValue(receipt.id, 'date')}
                                          onChange={(e) => updateEditValue(e.target.value)}
                                          className="flex-1 h-6 text-xs"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => saveField(receipt.id, 'date')}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Check className="h-2 w-2 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={cancelEditing}
                                          className="h-6 w-6 p-0"
                                        >
                                          <X className="h-2 w-2 text-red-600" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="text-muted-foreground flex-1">
                                          日付: {receipt.extracted_data.date || formatDate(receipt.upload_date)}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => startEditing(receipt.id, 'date', receipt.extracted_data.date)}
                                          className="h-6 w-6 p-0 hover:bg-muted"
                                        >
                                          <Edit2 className="h-2 w-2" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                {!receipt.transaction_id ? (
                                  <Button
                                    size="sm"
                                    onClick={() => createTransactionFromReceipt(receipt)}
                                    className="text-xs"
                                  >
                                    取引作成
                                  </Button>
                                ) : (
                                  <span className="text-xs text-green-600 font-medium">
                                    取引作成済み
                                  </span>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => reclassifyReceipt(receipt.id)}
                                  className="text-xs mr-2"
                                >
                                  再分類
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                  <Eye className="mr-1 h-3 w-3" />
                                  詳細
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden">
        <Header />
        <main className="p-4 pb-20">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">レシート管理</h1>
            <p className="text-sm text-muted-foreground">OCRで自動取引作成</p>
          </div>

          <div className="space-y-6">
            <ReceiptUpload 
              onUpload={handleReceiptUpload} 
              isProcessing={processingUpload}
            />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">最近のレシート</CardTitle>
                  <div className="flex items-center gap-1">
                    {!isSelectionMode ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsSelectionMode(true)}
                        className="text-xs h-6 px-2"
                      >
                        選択
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={selectAllReceipts}
                          className="text-xs h-6 px-2"
                        >
                          全選択
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={clearSelection}
                          className="text-xs h-6 px-2"
                        >
                          キャンセル
                        </Button>
                        {selectedReceipts.size > 0 && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={deleteSelectedReceipts}
                            className="text-xs h-6 px-2"
                          >
                            削除 ({selectedReceipts.size})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {receipts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">レシートがありません</p>
                    <p className="text-sm">上からアップロードしてください</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.slice(0, 5).map((receipt) => (
                      <div key={receipt.id} className={`p-3 border rounded-lg ${
                        selectedReceipts.has(receipt.id) ? 'bg-blue-50 border-blue-300' : ''
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
                            {isSelectionMode && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleReceiptSelection(receipt.id)}
                                className="h-5 w-5 p-0 flex-shrink-0"
                              >
                                {selectedReceipts.has(receipt.id) ? (
                                  <CheckSquare className="h-3 w-3 text-blue-600" />
                                ) : (
                                  <Square className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            <div className="text-sm font-medium break-words leading-tight">
                              {receipt.original_filename || receipt.filename}
                            </div>
                          </div>
                          <div className="flex items-start gap-2 flex-shrink-0">
                            {receipt.extracted_data?.amount && (
                              <div className="text-right">
                                {editingField?.receiptId === receipt.id && editingField?.field === 'amount' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={getEditValue(receipt.id, 'amount')}
                                      onChange={(e) => updateEditValue(e.target.value)}
                                      className="w-20 h-6 text-xs text-right"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => saveField(receipt.id, 'amount')}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Check className="h-2 w-2 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditing}
                                      className="h-6 w-6 p-0"
                                    >
                                      <X className="h-2 w-2 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-green-600">
                                      {formatCurrency(receipt.extracted_data.amount)}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditing(receipt.id, 'amount', receipt.extracted_data.amount)}
                                      className="h-5 w-5 p-0 hover:bg-muted"
                                    >
                                      <Edit2 className="h-2 w-2" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                            {!isSelectionMode && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteReceipt(receipt.id)}
                                className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 mt-0.5"
                                title="削除"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {/* モバイル版での全項目表示 */}
                        {receipt.extracted_data && (
                          <div className="mt-2 space-y-1 text-xs">
                            {/* 分類情報 */}
                            {receipt.extracted_data.classification && (
                              <div className="flex items-center justify-between p-2 bg-blue-50 rounded mb-2">
                                <div className="flex items-center gap-1">
                                  <Tag className="h-3 w-3 text-blue-600" />
                                  <span className="text-blue-800 font-medium text-xs">
                                    {receipt.extracted_data.classification.categoryName}
                                  </span>
                                  {receipt.extracted_data.classification.isBusiness && (
                                    <span className="text-xs bg-green-100 text-green-700 px-1 rounded">事業</span>
                                  )}
                                </div>
                                <span className="text-xs text-blue-600">
                                  {Math.round(receipt.extracted_data.classification.confidence * 100)}%
                                </span>
                              </div>
                            )}
                            {/* 説明 */}
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-blue-600" />
                              {editingField?.receiptId === receipt.id && editingField?.field === 'description' ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input
                                    type="text"
                                    value={getEditValue(receipt.id, 'description')}
                                    onChange={(e) => updateEditValue(e.target.value)}
                                    className="flex-1 h-5 text-xs"
                                    placeholder="説明を入力"
                                    autoFocus
                                  />
                                  <Button size="sm" variant="outline" onClick={() => saveField(receipt.id, 'description')} className="h-5 w-5 p-0">
                                    <Check className="h-2 w-2 text-green-600" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditing} className="h-5 w-5 p-0">
                                    <X className="h-2 w-2 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2 flex-1">
                                  <span className="flex-1 text-muted-foreground break-words leading-tight">
                                    {receipt.extracted_data.description || '説明なし'}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(receipt.id, 'description', receipt.extracted_data.description)}
                                    className="h-4 w-4 p-0 hover:bg-muted flex-shrink-0 mt-0.5"
                                  >
                                    <Edit2 className="h-2 w-2" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* 店舗名 */}
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-purple-600" />
                              {editingField?.receiptId === receipt.id && editingField?.field === 'merchantName' ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input
                                    type="text"
                                    value={getEditValue(receipt.id, 'merchantName')}
                                    onChange={(e) => updateEditValue(e.target.value)}
                                    className="flex-1 h-5 text-xs"
                                    placeholder="店舗名を入力"
                                    autoFocus
                                  />
                                  <Button size="sm" variant="outline" onClick={() => saveField(receipt.id, 'merchantName')} className="h-5 w-5 p-0">
                                    <Check className="h-2 w-2 text-green-600" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditing} className="h-5 w-5 p-0">
                                    <X className="h-2 w-2 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2 flex-1">
                                  <span className="flex-1 text-muted-foreground break-words leading-tight">
                                    店舗: {receipt.extracted_data.merchantName || '未設定'}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(receipt.id, 'merchantName', receipt.extracted_data.merchantName)}
                                    className="h-4 w-4 p-0 hover:bg-muted flex-shrink-0 mt-0.5"
                                  >
                                    <Edit2 className="h-2 w-2" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* 日付 */}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-orange-600" />
                              {editingField?.receiptId === receipt.id && editingField?.field === 'date' ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input
                                    type="date"
                                    value={getEditValue(receipt.id, 'date')}
                                    onChange={(e) => updateEditValue(e.target.value)}
                                    className="flex-1 h-5 text-xs"
                                    autoFocus
                                  />
                                  <Button size="sm" variant="outline" onClick={() => saveField(receipt.id, 'date')} className="h-5 w-5 p-0">
                                    <Check className="h-2 w-2 text-green-600" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditing} className="h-5 w-5 p-0">
                                    <X className="h-2 w-2 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="flex-1 text-muted-foreground">
                                    日付: {receipt.extracted_data.date || formatDate(receipt.upload_date)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(receipt.id, 'date', receipt.extracted_data.date)}
                                    className="h-4 w-4 p-0 hover:bg-muted"
                                  >
                                    <Edit2 className="h-2 w-2" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-muted-foreground">
                            アップロード: {formatDate(receipt.upload_date)}
                          </span>
                          {!receipt.transaction_id ? (
                            <Button
                              size="sm"
                              onClick={() => createTransactionFromReceipt(receipt)}
                              className="text-xs h-6 px-2"
                            >
                              取引作成
                            </Button>
                          ) : (
                            <span className="text-xs text-green-600">作成済み</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}