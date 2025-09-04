'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, FileImage, X, Loader2, Check } from 'lucide-react';
import { EnhancedPreview } from './enhanced-preview';
import { PhotographyHelp } from './photography-help';
// import { trackFeatureUse } from '@/lib/analytics/activity-tracker';

interface ReceiptUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  isProcessing?: boolean;
  allowMultiple?: boolean;
  maxFiles?: number;
}

export function ReceiptUpload({ onUpload, isProcessing = false, allowMultiple = true, maxFiles = 15 }: ReceiptUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [currentMaxFiles, setCurrentMaxFiles] = useState(maxFiles);
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev.slice(-4), logMessage]); // 最新5件保持
  };
  
  useEffect(() => {
    // コンポーネント初期化時のデバッグ情報
    addDebugLog('ReceiptUploadコンポーネント初期化');
    addDebugLog(`UserAgent: ${navigator.userAgent.slice(0, 50)}...`);
    
    // input要素の存在確認
    const checkInputs = () => {
      const fileInput = document.getElementById('receipt-file-input');
      const cameraInput = document.getElementById('receipt-camera-input');
      addDebugLog(`ファイル入力要素: ${fileInput ? '存在' : '不在'}`);
      addDebugLog(`カメラ入力要素: ${cameraInput ? '存在' : '不在'}`);
    };
    
    // DOM要素が作成されるまで少し待つ
    setTimeout(checkInputs, 100);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  }, []);

  const handleFilesSelect = (files: File[]) => {
    addDebugLog(`複数ファイル選択: ${files.length}枚`);
    
    // ファイル数制限チェック
    if (files.length > currentMaxFiles) {
      alert(`一度に処理できるファイルは最大${currentMaxFiles}枚までです。\n選択されたファイル: ${files.length}枚\n最初の${currentMaxFiles}枚を処理します。`);
      files = files.slice(0, currentMaxFiles);
    }
    
    const validFiles: File[] = [];
    const skippedFiles: string[] = [];
    
    for (const file of files) {
      addDebugLog(`ファイル検証: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
      
      if (!file.type.startsWith('image/')) {
        addDebugLog(`スキップ: 無効なファイルタイプ ${file.type}`);
        skippedFiles.push(`${file.name} (無効なファイルタイプ)`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        addDebugLog(`スキップ: ファイルサイズ過大 ${Math.round(file.size/1024/1024)}MB`);
        skippedFiles.push(`${file.name} (サイズ過大: ${Math.round(file.size/1024/1024)}MB)`);
        continue;
      }

      validFiles.push(file);
    }
    
    // スキップされたファイルがある場合は通知
    if (skippedFiles.length > 0) {
      const message = `以下のファイルはスキップされました:\n${skippedFiles.join('\n')}\n\n有効ファイル: ${validFiles.length}枚`;
      alert(message);
    }
    
    if (validFiles.length === 0) {
      alert('有効な画像ファイルがありません');
      return;
    }

    addDebugLog(`有効ファイル: ${validFiles.length}枚 (制限: ${currentMaxFiles}枚)`);
    setSelectedFiles(validFiles);
    
    // 全ファイルのプレビュー生成
    const newPreviews: string[] = [];
    validFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newPreviews[index] = result;
        
        // 全てのプレビューが生成されたらstateを更新
        if (newPreviews.filter(Boolean).length === validFiles.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
    
    setUploadStatus('idle');
  };

  // 後方互換性のため単一ファイル処理も残す
  const handleFileSelect = (file: File) => {
    handleFilesSelect([file]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addDebugLog('ファイル入力イベント発生');
    const files = e.target.files;
    addDebugLog(`ファイル数: ${files?.length || 0}`);
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      addDebugLog(`ファイル処理開始: ${fileArray.map(f => f.name).join(', ')}`);
      handleFilesSelect(fileArray);
    } else {
      addDebugLog('ファイルが選択されていない');
    }
    
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploadStatus('uploading');
      setProcessingProgress({ current: 0, total: selectedFiles.length });
      
      await onUpload(selectedFiles);
      setUploadStatus('success');
      
      // 成功後、少し待ってからリセット
      setTimeout(() => {
        clearSelection();
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setUploadStatus('idle');
    setProcessingProgress({ current: 0, total: 0 });
  };

  // EnhancedPreviewからのファイル/プレビュー更新ハンドラー
  const handleFilesUpdate = (newFiles: File[]) => {
    setSelectedFiles(newFiles);
  };

  const handlePreviewsUpdate = (newPreviews: string[]) => {
    setPreviews(newPreviews);
  };

  const triggerFileInput = () => {
    addDebugLog('ファイル選択ボタンクリック');
    const fileInput = document.getElementById('receipt-file-input') as HTMLInputElement;
    if (fileInput) {
      addDebugLog('ファイル入力要素をクリック');
      
      // イベントリスナーを一度だけ追加
      const handleFileChange = (e: Event) => {
        addDebugLog('ファイル変更イベント検出');
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          addDebugLog(`ファイル取得: ${file.name}`);
          handleFileSelect(file);
        } else {
          addDebugLog('ファイルが選択されませんでした');
        }
        // イベントリスナーを削除
        fileInput.removeEventListener('change', handleFileChange);
      };
      
      fileInput.addEventListener('change', handleFileChange);
      fileInput.click();
    } else {
      addDebugLog('エラー: ファイル入力要素が見つからない');
    }
  };

  const triggerCameraInput = () => {
    addDebugLog('カメラボタンクリック');
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    addDebugLog(`デバイス判定: ${isMobile ? 'モバイル' : 'デスクトップ'}`);
    
    const inputElement = isMobile 
      ? document.getElementById('receipt-camera-input') as HTMLInputElement
      : document.getElementById('receipt-file-input') as HTMLInputElement;
    
    if (inputElement) {
      addDebugLog(`${isMobile ? 'カメラ' : 'ファイル'}入力要素をクリック`);
      
      // イベントリスナーを一度だけ追加
      const handleInputChange = (e: Event) => {
        addDebugLog('入力変更イベント検出');
        const target = e.target as HTMLInputElement;
        const files = target.files;
        addDebugLog(`ファイル数: ${files?.length || 0}`);
        
        const file = files?.[0];
        if (file) {
          addDebugLog(`ファイル取得: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
          handleFileSelect(file);
        } else {
          addDebugLog('ファイルが選択されませんでした（キャンセルまたはエラー）');
        }
        // イベントリスナーを削除
        inputElement.removeEventListener('change', handleInputChange);
        inputElement.removeEventListener('cancel', handleInputCancel);
      };
      
      const handleInputCancel = () => {
        addDebugLog('ファイル選択がキャンセルされました');
        inputElement.removeEventListener('change', handleInputChange);
        inputElement.removeEventListener('cancel', handleInputCancel);
      };
      
      inputElement.addEventListener('change', handleInputChange);
      inputElement.addEventListener('cancel', handleInputCancel);
      inputElement.click();
    } else {
      addDebugLog(`エラー: ${isMobile ? 'カメラ' : 'ファイル'}入力要素が見つからない`);
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          レシートをアップロード
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedFiles.length === 0 ? (
          <div
            className={`relative p-8 text-center rounded-lg transition-all duration-200 ${
              dragOver 
                ? 'bg-primary/10 border-primary/50 border-2 border-dashed' 
                : 'bg-muted/50 hover:bg-muted/70 border border-dashed border-muted-foreground/25'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="receipt-file-input"
              type="file"
              accept="image/*"
              multiple={allowMultiple}
              onChange={handleFileInput}
              className="hidden"
            />
            
            {/* モバイルカメラ用input */}
            <input
              id="receipt-camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              multiple={allowMultiple}
              onChange={handleFileInput}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full ${dragOver ? 'bg-primary/20' : 'bg-primary/10'}`}>
                <Upload className={`h-8 w-8 ${dragOver ? 'text-primary' : 'text-primary/60'}`} />
              </div>
              
              <div>
                <p className="text-lg font-medium mb-2">
                  {dragOver 
                    ? `レシート${allowMultiple ? '（複数可）' : ''}をここにドロップ` 
                    : `レシート${allowMultiple ? '（複数可）' : ''}をドラッグ&ドロップ`
                  }
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  または
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={() => {
                      addDebugLog('「カメラで撮影」ボタン押下');
                      triggerCameraInput();
                    }} 
                    className="sm:flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    カメラで撮影
                  </Button>
                  <Button 
                    onClick={() => {
                      addDebugLog('「ファイルを選択」ボタン押下');
                      triggerFileInput();
                    }} 
                    variant="outline" 
                    className="sm:flex-1"
                  >
                    <FileImage className="mr-2 h-4 w-4" />
                    {allowMultiple ? '複数ファイルを選択' : 'ファイルを選択'}
                  </Button>
                </div>
              </div>
              
              {/* 📸 OCR品質向上のための詳細撮影ガイド */}
              <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                <div className="text-center mb-2">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center justify-center gap-1">
                    📷 高精度OCRのための撮影ガイド
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">✅</span>
                      <span className="font-medium">良い例</span>
                    </div>
                    <ul className="text-muted-foreground space-y-0.5 ml-6">
                      <li>• 明るい場所で撮影</li>
                      <li>• レシート全体がフレーム内</li>
                      <li>• 手ブレしていない</li>
                      <li>• 文字が鮮明に読める</li>
                      <li>• 影がかかっていない</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 dark:text-red-400">❌</span>
                      <span className="font-medium">避けるべき</span>
                    </div>
                    <ul className="text-muted-foreground space-y-0.5 ml-6">
                      <li>• 暗い場所での撮影</li>
                      <li>• レシートが途切れている</li>
                      <li>• ピントが合っていない</li>
                      <li>• 斜めから撮影</li>
                      <li>• 反射や光の映り込み</li>
                    </ul>
                  </div>
                </div>
                
                {/* 📊 技術的な仕様情報 */}
                <div className="border-t pt-2 mt-2 border-blue-200/50 dark:border-blue-800/30">
                  <div className="flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="text-blue-700 dark:text-blue-300">
                        <span className="font-medium">対応形式:</span> JPG, PNG, WEBP
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        <span className="font-medium">推奨サイズ:</span> 0.5-2MB（高品質OCR）
                      </p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-blue-700 dark:text-blue-300">
                        <span className="font-medium">最大サイズ:</span> 10MB/枚
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        <span className="font-medium">推奨解像度:</span> 1200px以上
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 🎯 クイックヒント */}
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/30 rounded p-2">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-1">
                    <span className="mt-0.5">💡</span>
                    <span>
                      <strong>ヒント:</strong> 
                      スマートフォンのカメラアプリで撮影してからアップロードすると、
                      より高品質な画像が得られます。
                    </span>
                  </p>
                </div>
              </div>
                
                {/* 枚数制限選択 */}
                {allowMultiple && (
                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-muted-foreground">処理枚数:</label>
                    <select 
                      value={currentMaxFiles} 
                      onChange={(e) => setCurrentMaxFiles(Number(e.target.value))}
                      className="px-2 py-1 text-xs border rounded bg-background"
                    >
                      {Array.from({length: 15}, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}枚</option>
                      ))}
                    </select>
                    <span className="text-muted-foreground">まで選択可能</span>
                  </div>
                )}
              </div>
              
              {/* デバッグログ表示 */}
              {debugLogs.length > 0 && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs font-medium mb-2">デバッグログ:</p>
                  <div className="space-y-1">
                    {debugLogs.map((log, index) => (
                      <p key={index} className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 強化されたプレビュー */}
            <div className="flex justify-between items-center">
              <h3 className="font-medium">選択されたレシート ({selectedFiles.length}枚)</h3>
              <button
                onClick={clearSelection}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <EnhancedPreview
              files={selectedFiles}
              previews={previews}
              onFilesUpdate={handleFilesUpdate}
              onPreviewsUpdate={handlePreviewsUpdate}
            />

            {/* プログレス表示 */}
            {(uploadStatus === 'uploading' && processingProgress.total > 0) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>処理中...</span>
                  <span>{processingProgress.current} / {processingProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* アップロードボタン */}
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploadStatus === 'uploading' || isProcessing}
                className="flex-1"
              >
                {uploadStatus === 'uploading' || isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedFiles.length > 1 ? `${selectedFiles.length}枚を処理中...` : 'OCR処理中...'}
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    処理完了
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {selectedFiles.length > 1 ? `${selectedFiles.length}枚をOCR実行` : 'OCR実行'}
                  </>
                )}
              </Button>
              
              <Button
                onClick={clearSelection}
                variant="outline"
                disabled={uploadStatus === 'uploading' || isProcessing}
              >
                キャンセル
              </Button>
            </div>

            {uploadStatus === 'error' && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  処理中にエラーが発生しました。もう一度お試しください。
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}