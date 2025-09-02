'use client';

import React from 'react';
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
import { PhotographyHelp } from '@/components/receipts/photography-help';
import { RealtimeProgress } from '@/components/receipts/realtime-progress';
import { SidebarGuide } from '@/components/layout/sidebar-guide';
import { Calculator, Camera, FileText, Calendar, Tag, Building2, User, Eye, Edit2, Check, X, Trash2, CheckSquare, Square, AlertTriangle, Search, Filter, SortAsc, SortDesc, Download, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
// import { ReceiptOCR } from '@/lib/ocr/vision-api'; // サーバーサイドAPI使用のため削除
import { autoClassifyReceipt } from '@/lib/utils/receipt-classifier';
import { classifyWithAI } from '@/lib/classification/huggingface-classifier';
import { classifyWithOpenAI, setOpenAIApiKey } from '@/lib/classification/openai-classifier';

// 画像を自動圧縮してBase64に変換する関数
const compressImageToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // 元の画像サイズ
      const originalWidth = img.width;
      const originalHeight = img.height;
      
      // 最大サイズを設定（レシートの可読性を保つため）
      const maxWidth = 1200;
      const maxHeight = 1600;
      
      // アスペクト比を保持してリサイズ計算
      let { width, height } = calculateOptimalSize(originalWidth, originalHeight, maxWidth, maxHeight);
      
      canvas.width = width;
      canvas.height = height;
      
      // 高品質で描画
      ctx!.imageSmoothingEnabled = true;
      ctx!.imageSmoothingQuality = 'high';
      ctx!.drawImage(img, 0, 0, width, height);
      
      // 段階的に品質を下げて3MB以下にする
      const tryCompress = (quality: number): void => {
        const base64 = canvas.toDataURL('image/jpeg', quality);
        const sizeKB = Math.round(base64.length * 0.75 / 1024); // Base64サイズ推定
        
        console.log(`圧縮試行: 品質${Math.round(quality * 100)}%, サイズ: ${sizeKB}KB`);
        
        if (base64.length < 3 * 1024 * 1024 || quality < 0.3) {
          // 3MB以下になったか、最低品質に達した
          console.log(`✅ 圧縮完了: 元${Math.round(file.size/1024)}KB → ${sizeKB}KB`);
          resolve(base64);
        } else {
          // まだ大きいので品質を下げて再試行
          tryCompress(quality - 0.1);
        }
      };
      
      // 最初は高品質から開始
      tryCompress(0.9);
    };
    
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = URL.createObjectURL(file);
  });
};

// 最適なサイズを計算する関数
const calculateOptimalSize = (originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number) => {
  let width = originalWidth;
  let height = originalHeight;
  
  // アスペクト比を保持してリサイズ
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width *= ratio;
    height *= ratio;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
};

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
  const [showRealtimeProgress, setShowRealtimeProgress] = useState(false);
  const [currentUploadFiles, setCurrentUploadFiles] = useState<File[]>([]);
  // 処理結果表示は削除
  // const [processingResults, setProcessingResults] = useState<{successCount: number, failedFiles: Array<{fileName: string, error: string}>, processedReceipts: Array<{fileName: string, data: ExtractedData}>}>({ successCount: 0, failedFiles: [], processedReceipts: [] });
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'merchant' | 'upload'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // スタイル定義
  const newReceiptStyles = `bg-gradient-to-br from-slate-800 via-emerald-800 to-slate-900 border-emerald-600/50 text-slate-100 shadow-lg 
    [&_*]:text-slate-100 [&_.text-muted-foreground]:!text-slate-300 [&_.text-green-600]:!text-emerald-300 
    [&_.text-blue-600]:!text-slate-300 [&_.text-purple-600]:!text-slate-300 [&_.text-orange-600]:!text-amber-300`;
  
  const existingReceiptStyles = `bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 border-blue-600/50 text-slate-100 shadow-lg 
    [&_*]:text-slate-100 [&_.text-muted-foreground]:!text-slate-300 [&_.text-green-600]:!text-green-300 
    [&_.text-blue-600]:!text-blue-300 [&_.text-purple-600]:!text-purple-300 [&_.text-orange-600]:!text-amber-300`;
  
  const selectedReceiptStyles = 'bg-blue-50 border-blue-400 shadow-md';

  // レシートのフィルタリング・ソート機能
  const filteredAndSortedReceipts = React.useMemo(() => {
    let filtered = receipts;

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(receipt => 
        receipt.extracted_data?.description?.toLowerCase().includes(query) ||
        receipt.extracted_data?.merchantName?.toLowerCase().includes(query) ||
        receipt.filename?.toLowerCase().includes(query) ||
        receipt.ocr_text?.toLowerCase().includes(query)
      );
    }

    // カテゴリフィルタ
    if (filterCategory !== 'all') {
      filtered = filtered.filter(receipt => 
        receipt.extracted_data?.classification?.categoryName === filterCategory
      );
    }

    // 日付範囲フィルタ
    if (filterDateRange.start) {
      filtered = filtered.filter(receipt => {
        const receiptDate = receipt.extracted_data?.date || receipt.upload_date;
        return receiptDate >= filterDateRange.start;
      });
    }
    if (filterDateRange.end) {
      filtered = filtered.filter(receipt => {
        const receiptDate = receipt.extracted_data?.date || receipt.upload_date;
        return receiptDate <= filterDateRange.end;
      });
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.extracted_data?.amount || 0;
          bValue = b.extracted_data?.amount || 0;
          break;
        case 'merchant':
          aValue = a.extracted_data?.merchantName || '';
          bValue = b.extracted_data?.merchantName || '';
          break;
        case 'upload':
          aValue = a.upload_date;
          bValue = b.upload_date;
          break;
        case 'date':
        default:
          aValue = a.extracted_data?.date || a.upload_date;
          bValue = b.extracted_data?.date || b.upload_date;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [receipts, searchQuery, filterCategory, filterDateRange, sortBy, sortOrder]);

  // 利用可能なカテゴリ一覧を取得
  const availableCategories = React.useMemo(() => {
    const categories = new Set<string>();
    receipts.forEach(receipt => {
      if (receipt.extracted_data?.classification?.categoryName) {
        categories.add(receipt.extracted_data.classification.categoryName);
      }
    });
    return Array.from(categories).sort();
  }, [receipts]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user]);

  // 新しいレシートかどうかを判定する関数
  const isNewReceipt = (receiptDate: string) => {
    if (!lastUploadTime) return false;
    const receiptUploadTime = new Date(receiptDate);
    const timeDiff = receiptUploadTime.getTime() - lastUploadTime.getTime();
    return timeDiff >= -60000; // 60秒以内にアップロードされたレシートを新規とする
  };

  // 重複レシートをチェックする関数
  const checkDuplicateReceipt = (newData: ExtractedData, existingReceipts: Receipt[]): Receipt | null => {
    if (!newData.amount || !newData.date || !newData.merchantName) {
      return null; // 必要なデータが不足している場合はチェックしない
    }

    return existingReceipts.find(receipt => {
      const existing = receipt.extracted_data;
      if (!existing.amount || !existing.date || !existing.merchantName) {
        return false;
      }

      // 金額が完全一致
      const amountMatch = existing.amount === newData.amount;
      
      // 日付が完全一致（文字列として比較）
      const dateMatch = existing.date === newData.date;
      
      // 店舗名が完全一致（大文字小文字を無視）
      const merchantMatch = existing.merchantName.toLowerCase().trim() === newData.merchantName.toLowerCase().trim();

      return amountMatch && dateMatch && merchantMatch;
    }) || null;
  };

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
      return;
    }

    try {
      // Supabase Storageに画像を保存
      let imageUrl = null;
      try {
        // Base64をBlobに変換
        const base64Data = imageBase64.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        // Supabase Storageにアップロード
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(`${user.id}/${fileName}`, blob, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('画像アップロードエラー:', uploadError);
        } else {
          // 公開URLを取得
          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(uploadData.path);
          imageUrl = urlData.publicUrl;
        }
      } catch (uploadError) {
        console.error('画像アップロード処理エラー:', uploadError);
      }

      // AI分類とキーワード分類のハイブリッド実行
      let classificationResult = null;
      if (extractedData.amount && extractedData.amount > 0) {
        
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
          }
        } catch (error) {
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
          }
        }
        
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
          extracted_data: {
            ...receiptDataToSave,
            image_url: imageUrl  // extracted_dataの中に画像URLを保存
          },
          upload_date: new Date().toISOString()
        })
        .select()
        .single();

      if (receiptError) throw receiptError;
      
      // 抽出されたデータがある場合、取引として保存（分類結果を活用）
      if (extractedData.amount && extractedData.amount > 0) {
        // ユーザーのデフォルト現金口座を取得
        let { data: cashAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('account_name', '現金')
          .single();

        // 現金口座が存在しない場合は自動作成
        if (!cashAccount) {
          console.log('現金口座が存在しないため自動作成します');
          const { data: newAccount, error: accountError } = await supabase
            .from('accounts')
            .insert({
              user_id: user.id,
              account_type: 'bank',
              account_name: '現金',
              institution_name: 'デフォルト',
              is_active: true,
              metadata: { is_default: true, auto_created: true }
            })
            .select('id')
            .single();
            
          if (accountError) {
            console.error('現金口座作成エラー:', accountError);
            throw new Error(`現金口座の作成に失敗しました: ${accountError.message}`);
          }
          cashAccount = newAccount;
          console.log('現金口座を作成しました:', cashAccount.id);
        }

        const transactionData = {
          user_id: user.id,
          account_id: cashAccount.id, // 確実に存在するアカウントID
          amount: extractedData.amount,
          description: extractedData.description || 'レシートからの取引',
          transaction_date: extractedData.date || new Date().toISOString().split('T')[0],
          category_id: classificationResult?.categoryId || null,
          is_business: classificationResult ? classificationResult.isBusiness : true,
          confidence_score: classificationResult?.confidence || 0.5
        };

        const { data: transactionData_response, error: transactionError } = await supabase
          .from('transactions')
          .insert(transactionData)
          .select('id')
          .single();

        if (transactionError) {
          console.error('Transaction save error:', transactionError);
          console.error('Transaction data that failed:', transactionData);
        } else {
          // 取引作成成功時、レシートテーブルのtransaction_idを更新
          const transactionId = transactionData_response?.id;
          if (transactionId && receiptData) {
            await supabase
              .from('receipts')
              .update({ 
                transaction_id: transactionId,
                is_processed: true,
                processing_status: 'completed'
              })
              .eq('id', receiptData.id);
          }
          console.log('Transaction saved successfully', {
            transactionId,
            amount: extractedData.amount,
            categoryId: classificationResult?.categoryId,
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
      const uploadStartTime = new Date();
      setLastUploadTime(uploadStartTime);
      

      // サーバーサイドOCR処理に変更 - APIキーは不要
      
      const results: Array<{file: File, success: boolean, data?: any, error?: string, isDuplicate?: boolean, duplicateReceipt?: Receipt}> = [];
      let apiCallCount = 0;
      const maxRetries = 3;
      const retryDelay = 1000; // 1秒
      
      // 現在のレシート一覧を取得（重複チェック用）
      const currentReceipts = await new Promise<Receipt[]>((resolve) => {
        const fetchCurrentReceipts = async () => {
          try {
            const { data, error } = await supabase
              .from('receipts')
              .select('*')
              .eq('user_id', user.id);
            if (error) throw error;
            resolve(data || []);
          } catch (error) {
            console.error('Error fetching current receipts for duplicate check:', error);
            resolve([]);
          }
        };
        fetchCurrentReceipts();
      });
      
      // 各ファイルを順次処理
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileName = '';
        let imageBase64 = '';
        
        try {
          // ファイル名生成
          const fileExt = file.name.split('.').pop();
          fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

          // 画像圧縮処理（3MB以下に自動調整）
          imageBase64 = await compressImageToBase64(file);
          console.log('圧縮後のBase64サイズ:', Math.round(imageBase64.length / 1024), 'KB');

          // 処理開始時点でレシート記録を作成（失敗時の追跡のため）
          const { data: initialReceipt, error: initialError } = await supabase
            .from('receipts')
            .insert({
              user_id: user.id,
              filename: fileName,
              original_filename: file.name,
              file_size: file.size,
              ocr_text: '',
              extracted_data: {},
              is_processed: false,
              processing_status: 'processing',
              confidence_score: 0.0
            })
            .select()
            .single();
            
          if (initialError) {
            console.error('レシート記録作成エラー:', initialError);
            throw new Error(`レシート記録作成に失敗: ${initialError.message}`);
          }

          // OCR処理（サーバーサイドAPI経由、リトライ機能付き）
          let result;
          let retryCount = 0;
          
          while (retryCount <= maxRetries) {
            try {
              apiCallCount++;
              
              // API制限チェック（軽量化）
              if (apiCallCount > 10) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                apiCallCount = 0;
              }
              
              // サーバーサイドOCR API呼び出し（タイムアウト制御付き）
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト
              
              const ocrResponse = await fetch('/api/ocr/receipt', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  imageBase64,
                  useGemini: true // Geminiを優先使用
                }),
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              console.log('OCR Response status:', ocrResponse.status);
              console.log('OCR Response headers:', Object.fromEntries(ocrResponse.headers.entries()));
              
              if (!ocrResponse.ok) {
                const responseText = await ocrResponse.text();
                console.error('OCR API Error Response:', responseText);
                
                let errorMessage = 'OCR processing failed';
                try {
                  const errorData = JSON.parse(responseText);
                  errorMessage = errorData.error || 'OCR processing failed';
                } catch (parseError) {
                  errorMessage = `OCR API returned non-JSON response (${ocrResponse.status}): ${responseText.substring(0, 200)}`;
                }
                throw new Error(errorMessage);
              }
              
              const responseText = await ocrResponse.text();
              console.log('OCR API Success Response:', responseText.substring(0, 500));
              
              let ocrData;
              try {
                ocrData = JSON.parse(responseText);
              } catch (parseError) {
                console.error('Failed to parse OCR response as JSON:', responseText.substring(0, 500));
                throw new Error(`OCR API returned invalid JSON: ${parseError.message}`);
              }
              result = ocrData.data;
              break; // 成功した場合はループを抜ける
              
            } catch (ocrError) {
              retryCount++;
              console.error(`OCR処理エラー (試行 ${retryCount}/${maxRetries + 1}):`, ocrError);
              
              if (retryCount <= maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
              } else {
                throw new Error(`OCR処理に${maxRetries + 1}回失敗しました: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
              }
            }
          }
          
          const { ocrText, extractedData } = result;

          // 重複チェック
          const duplicateReceipt = checkDuplicateReceipt(extractedData, currentReceipts);
          if (duplicateReceipt) {
            results.push({
              file,
              success: false,
              isDuplicate: true,
              duplicateReceipt,
              error: `重複レシート: ${extractedData.merchantName} ¥${extractedData.amount} (${extractedData.date})`
            });
            continue; // 重複の場合はスキップ
          }
          
          // 複数レシートが検出された場合（1枚以上）
          if ((result as any).multipleReceipts && Array.isArray((result as any).multipleReceipts) && (result as any).multipleReceipts.length >= 1) {
            
            // 各レシートを個別に保存
            for (let j = 0; j < (result as any).multipleReceipts.length; j++) {
              const receiptData = (result as any).multipleReceipts[j];
              const subFileName = `${user.id}/${Date.now()}_${i}_receipt_${j + 1}.${fileExt}`;
              
              await saveReceiptToDatabase(imageBase64, subFileName, ocrText, receiptData);
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
            
          } else {
            // 単一レシートの場合
            await saveReceiptToDatabase(imageBase64, fileName, ocrText, extractedData);
            
            results.push({
              file,
              success: true,
              data: { ocrText, extractedData }
            });
            
          }
          
        } catch (error) {
          console.error(`✗ Failed to process ${file.name}:`, error);
          let errorMessage = 'Unknown error';
          
          if (error instanceof Error) {
            errorMessage = error.message;
            
            // 特定のエラータイプに応じたメッセージ
            if (error.message.includes('API')) {
              errorMessage = 'APIエラー: サービスが一時的に利用できません';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
              errorMessage = 'ネットワークエラー: インターネット接続を確認してください';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'タイムアウトエラー: 処理に時間がかかりすぎました';
            } else if (error.message.includes('quota') || error.message.includes('limit')) {
              errorMessage = 'API使用制限に達しました。しばらくしてからお試しください';
            }
          }
          
          // エラー時も失敗記録をDBに保存（デバッグ・改善のため）
          try {
            await supabase
              .from('receipts')
              .insert({
                user_id: user.id,
                filename: fileName || `error_${Date.now()}_${i}`,
                original_filename: file.name,
                file_size: file.size,
                ocr_text: '',
                extracted_data: {},
                is_processed: false,
                processing_status: 'failed',
                error_message: errorMessage,
                confidence_score: 0.0
              });
          } catch (dbError) {
            console.error('エラー記録の保存に失敗:', dbError);
          }
          
          results.push({
            file,
            success: false,
            error: errorMessage
          });
        }
        
        // 短い待機時間（API制限対応）
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // 結果をステートに保存
      const successResults = results.filter(r => r.success);
      const failedFiles = results.filter(r => !r.success).map(r => ({
        fileName: r.file.name,
        error: r.error || 'Unknown error',
        isDuplicate: r.isDuplicate
      }));
      
      const processedReceipts: Array<{fileName: string, data: ExtractedData, receiptIndex?: number}> = [];
      
      successResults.forEach((r, index) => {
        console.log('Processing receipt:', {
          fileName: r.file.name,
          hasMultipleReceipts: !!r.data?.multipleReceipts,
          multipleCount: r.data?.multipleCount,
          receiptsLength: r.data?.multipleReceipts?.length,
          dataKeys: Object.keys(r.data || {})
        });
        if (r.data?.multipleReceipts && Array.isArray(r.data.multipleReceipts)) {
          // 複数レシートの場合、全てを個別に追加
          r.data.multipleReceipts.forEach((receipt: any, receiptIndex: number) => {
            processedReceipts.push({
              fileName: `${r.file.name} (レシート${receiptIndex + 1}/${r.data.multipleReceipts.length})`,
              data: receipt,
              receiptIndex: receiptIndex + 1
            });
          });
        } else {
          // 単一レシートの場合
          processedReceipts.push({
            fileName: r.file.name,
            data: r.data?.extractedData || {}
          });
        }
      });
      
      
      // 処理結果表示は削除
      // setProcessingResults({ 
      //   successCount: processedReceipts.length, // 実際に処理されたレシート数
      //   failedFiles, 
      //   processedReceipts 
      // });
      
      // レシート一覧を更新（エラーの場合でも実行）
      try {
        await fetchReceipts();
      } catch (fetchError) {
        console.error('レシート一覧の更新エラー:', fetchError);
      }
      
      // 新しいレシート判定用のタイムスタンプを更新（処理完了時点）
      setLastUploadTime(new Date());
      
      
    } catch (error) {
      console.error('Batch processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ 処理エラー: ${errorMessage}`);
    } finally {
      // 確実にローディング状態を解除
      setProcessingUpload(false);
      setShowRealtimeProgress(false);
      setCurrentUploadFiles([]);
      
      // レシート一覧の更新（エラーの場合でも実行）
      try {
        await fetchReceipts();
      } catch (fetchError) {
        console.error('レシート一覧の更新エラー:', fetchError);
        // フェッチ失敗でもローディングは解除する
      }
    }
  };

  // リアルタイムプログレスの完了処理
  const handleProgressComplete = (results: any[]) => {
    setShowRealtimeProgress(false);
    setCurrentUploadFiles([]);
    setProcessingUpload(false);
    
    // レシート一覧を再読み込み
    fetchReceipts();
    
    // アラートは表示しない（リアルタイム表示で十分）
  };

  // リアルタイムプログレスのキャンセル処理
  const handleProgressCancel = () => {
    setShowRealtimeProgress(false);
    setCurrentUploadFiles([]);
    setProcessingUpload(false);
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
      
      // キーワード検索用テキストを表示
      const searchText = `${receipt.extracted_data.description || ''} ${receipt.extracted_data.merchantName || ''} ${receipt.ocr_text || ''}`.toLowerCase();
      
      // エナジードリンクキーワードチェック
      const energyKeywords = ['エナジー', 'energy', 'レッドブル', 'redbull', 'モンスター', 'monster', 'リポビタン'];
      const foundEnergyKeywords = energyKeywords.filter(keyword => searchText.includes(keyword));
      if (foundEnergyKeywords.length > 0) {
      } else {
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
      
      alert(`${count}件のレシートを削除しました`);
      
      // 選択状態をクリア
      clearSelection();
    } catch (error) {
      console.error('Error deleting receipts:', error);
      alert('レシートの削除に失敗しました');
    }
  };

  // CSVエクスポート機能
  const exportToCSV = () => {
    const headers = ['日付', '店舗名', '金額', '説明', 'カテゴリ', '事業用', '信頼度', 'ファイル名'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedReceipts.map(receipt => [
        receipt.extracted_data?.date || formatDate(receipt.upload_date),
        `"${receipt.extracted_data?.merchantName || ''}"`,
        receipt.extracted_data?.amount || 0,
        `"${receipt.extracted_data?.description || ''}"`,
        `"${receipt.extracted_data?.classification?.categoryName || ''}"`,
        receipt.extracted_data?.classification?.isBusiness ? '事業用' : '個人用',
        receipt.extracted_data?.classification?.confidence ? `${Math.round(receipt.extracted_data.classification.confidence * 100)}%` : '',
        `"${receipt.original_filename || receipt.filename}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `receipts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSONエクスポート機能
  const exportToJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalReceipts: filteredAndSortedReceipts.length,
      receipts: filteredAndSortedReceipts.map(receipt => ({
        id: receipt.id,
        filename: receipt.original_filename || receipt.filename,
        uploadDate: receipt.upload_date,
        extractedData: receipt.extracted_data,
        classification: receipt.extracted_data?.classification,
        imageUrl: receipt.image_url
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `receipts_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center animate-fade-in">
          <div className="relative mb-8">
            <Calculator className="h-16 w-16 text-primary mx-auto animate-spin" />
            <div className="absolute inset-0 h-16 w-16 mx-auto animate-ping bg-primary/20 rounded-full"></div>
            <div className="absolute inset-2 h-12 w-12 mx-auto animate-pulse bg-primary/10 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground animate-pulse">Keiri App</p>
            <p className="text-muted-foreground animate-pulse">読み込み中...</p>
          </div>
          <div className="flex justify-center mt-6 space-x-2">
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '400ms'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64 animate-fade-in">
          <main className="p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">レシート管理</h1>
                <p className="text-muted-foreground">レシートをアップロードしてOCRで自動取引作成</p>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* アップロードエリア */}
                <div className="space-y-6">
                  <ReceiptUpload 
                    onUpload={handleReceiptUpload} 
                    isProcessing={processingUpload}
                  />
                  <PhotographyHelp />
                </div>

{/* 処理結果表示は色分けで判断するため削除 */}

                {/* レシート一覧 */}
                <div>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <CardTitle>レシート一覧</CardTitle>
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
                      
                      {/* 検索・フィルタUI */}
                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* 検索 */}
                          <div className="flex-1">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                              <Input
                                placeholder="レシートを検索（店舗名、説明、ファイル名）"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          
                          {/* カテゴリフィルタ */}
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                          >
                            <option value="all">全カテゴリ</option>
                            {availableCategories.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                          
                          {/* ソート */}
                          <div className="flex gap-2">
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'merchant' | 'upload')}
                              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                            >
                              <option value="date">日付順</option>
                              <option value="upload">アップロード順</option>
                              <option value="amount">金額順</option>
                              <option value="merchant">店舗名順</option>
                            </select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        {/* 日付範囲フィルタ */}
                        <div className="flex gap-4 items-center">
                          <span className="text-sm text-muted-foreground">日付範囲:</span>
                          <Input
                            type="date"
                            value={filterDateRange.start}
                            onChange={(e) => setFilterDateRange(prev => ({...prev, start: e.target.value}))}
                            className="w-40"
                          />
                          <span className="text-muted-foreground">〜</span>
                          <Input
                            type="date"
                            value={filterDateRange.end}
                            onChange={(e) => setFilterDateRange(prev => ({...prev, end: e.target.value}))}
                            className="w-40"
                          />
                          {(filterDateRange.start || filterDateRange.end) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFilterDateRange({start: '', end: ''})}
                            >
                              クリア
                            </Button>
                          )}
                        </div>
                        
                        {/* 検索結果件数とエクスポート */}
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            {filteredAndSortedReceipts.length}件のレシート{searchQuery.trim() || filterCategory !== 'all' || filterDateRange.start || filterDateRange.end ? ' (フィルタ済み)' : ''}
                          </div>
                          
                          {filteredAndSortedReceipts.length > 0 && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToCSV}
                                className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                CSV
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToJSON}
                                className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                              >
                                <FileDown className="h-4 w-4 mr-2" />
                                JSON
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingReceipts ? (
                        <div className="text-center py-8 animate-fade-in">
                          <div className="relative">
                            <Calculator className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                            <div className="absolute inset-0 h-8 w-8 mx-auto animate-pulse bg-primary/20 rounded-full"></div>
                          </div>
                          <p className="text-muted-foreground animate-pulse">読み込み中...</p>
                          <div className="flex justify-center mt-4 space-x-1">
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                          </div>
                        </div>
                      ) : filteredAndSortedReceipts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">レシートがありません</p>
                          <p className="text-sm">左側からレシートをアップロードしてください</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredAndSortedReceipts.map((receipt, index) => (
                            <div
                              key={receipt.id}
                              className={`p-4 border rounded-lg hover:bg-muted/50 transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-lg animate-fade-in ${
                                selectedReceipts.has(receipt.id) 
                                  ? selectedReceiptStyles
                                  : isNewReceipt(receipt.upload_date)
                                    ? newReceiptStyles
                                    : existingReceiptStyles
                              }`}
                              style={{
                                animationDelay: `${index * 50}ms`,
                                animationFillMode: 'both'
                              }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
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
                                  {isNewReceipt(receipt.upload_date) && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-emerald-600 shadow-sm">
                                      ✨ NEW
                                    </span>
                                  )}
                                </div>
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
                                        <Tag className="h-3 w-3 !text-blue-600" />
                                        <span className="!text-blue-800 font-medium">
                                          {receipt.extracted_data.classification.categoryName}
                                        </span>
                                        {receipt.extracted_data.classification.isBusiness && (
                                          <span className="text-xs bg-green-100 !text-green-700 px-1 rounded">事業用</span>
                                        )}
                                      </div>
                                      <span className="text-xs !text-blue-600">
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
        
        {/* サイドバーガイド */}
        <SidebarGuide />
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden">
        <Header />
        <main className="p-4 pb-20 animate-fade-in">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">レシート管理</h1>
            <p className="text-sm text-muted-foreground">OCRで自動取引作成</p>
          </div>

          <div className="space-y-6">
            <ReceiptUpload 
              onUpload={handleReceiptUpload} 
              isProcessing={processingUpload}
            />
            
            <PhotographyHelp />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-lg">レシート一覧</CardTitle>
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
                
                {/* モバイル版検索 */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="レシートを検索"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-xs"
                    >
                      <option value="all">全カテゴリ</option>
                      {availableCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'merchant' | 'upload')}
                      className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-xs"
                    >
                      <option value="date">日付順</option>
                      <option value="upload">アップロード順</option>
                      <option value="amount">金額順</option>
                      <option value="merchant">店舗順</option>
                    </select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-2"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {filteredAndSortedReceipts.length}件{searchQuery.trim() || filterCategory !== 'all' ? ' (フィルタ済み)' : ''}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAndSortedReceipts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">レシートがありません</p>
                    <p className="text-sm">上からアップロードしてください</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAndSortedReceipts.slice(0, 10).map((receipt, index) => (
                      <div 
                        key={receipt.id} 
                        className={`p-3 border rounded-lg transition-all duration-300 ease-in-out transform hover:scale-[1.01] animate-fade-in ${
                          selectedReceipts.has(receipt.id) 
                            ? selectedReceiptStyles
                            : isNewReceipt(receipt.upload_date)
                              ? newReceiptStyles
                              : existingReceiptStyles
                        }`}
                        style={{
                          animationDelay: `${index * 40}ms`,
                          animationFillMode: 'both'
                        }}
                      >
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
                                  <Tag className="h-3 w-3 !text-blue-600" />
                                  <span className="!text-blue-800 font-medium text-xs">
                                    {receipt.extracted_data.classification.categoryName}
                                  </span>
                                  {receipt.extracted_data.classification.isBusiness && (
                                    <span className="text-xs bg-green-100 !text-green-700 px-1 rounded">事業</span>
                                  )}
                                </div>
                                <span className="text-xs !text-blue-600">
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

{/* リアルタイムプログレス表示を削除 */}
    </div>
  );
}