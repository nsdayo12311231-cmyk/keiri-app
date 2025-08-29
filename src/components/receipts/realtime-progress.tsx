'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Eye, 
  FileText, 
  Zap,
  Loader2,
  X,
  TrendingUp,
  BarChart3,
  Target
} from 'lucide-react';

interface ProcessingFile {
  id: string;
  filename: string;
  status: 'waiting' | 'processing' | 'completed' | 'error' | 'cancelled';
  stage: 'upload' | 'ocr' | 'classification' | 'database' | 'done';
  progress: number; // 0-100
  extractedData?: {
    amount?: number;
    merchantName?: string;
    confidence?: number;
  };
  error?: string;
  processingTime?: number;
}

interface RealtimeProgressProps {
  files: File[];
  onComplete: (results: any[]) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export function RealtimeProgress({ files, onComplete, onCancel, isVisible }: RealtimeProgressProps) {
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<number | null>(null);
  const [isProcessingStarted, setIsProcessingStarted] = useState(false);

  // ファイル処理状況を初期化
  useEffect(() => {
    if (files.length > 0 && isVisible && !isProcessingStarted) {
      const initialFiles: ProcessingFile[] = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        filename: file.name,
        status: 'waiting',
        stage: 'upload',
        progress: 0
      }));
      setProcessingFiles(initialFiles);
      setStartTime(Date.now());
      setCurrentStage(`${files.length}枚のレシートを処理中...`);
      setIsProcessingStarted(true);
    }
  }, [files, isVisible, isProcessingStarted]);

  // 進捗状況を更新
  const updateFileProgress = (fileId: string, updates: Partial<ProcessingFile>) => {
    setProcessingFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ));
  };

  // 全体進捗を計算
  useEffect(() => {
    if (processingFiles.length === 0) return;

    const totalProgress = processingFiles.reduce((sum, file) => sum + file.progress, 0);
    const newOverallProgress = Math.round(totalProgress / processingFiles.length);
    setOverallProgress(newOverallProgress);

    // 残り時間の推定
    if (startTime && newOverallProgress > 10) {
      const elapsedTime = Date.now() - startTime;
      const estimatedTotal = (elapsedTime / newOverallProgress) * 100;
      const remainingTime = Math.max(0, estimatedTotal - elapsedTime);
      setEstimatedTimeLeft(Math.round(remainingTime / 1000));
    }

    // 完了判定
    const completedFiles = processingFiles.filter(f => f.status === 'completed');
    if (completedFiles.length === processingFiles.length && completedFiles.length > 0) {
      setTimeout(() => onComplete(completedFiles), 1000);
    }
  }, [processingFiles, startTime, onComplete]);

  // 外部からのプログレス更新用関数を提供
  const updateProgress = useCallback((fileIndex: number, updates: Partial<ProcessingFile>) => {
    if (processingFiles[fileIndex]) {
      updateFileProgress(processingFiles[fileIndex].id, updates);
    }
  }, [processingFiles]);

  // モック処理は削除し、実際のOCR処理からのプログレス更新を待機

  // ステージ表示用のアイコンとラベル
  const getStageInfo = (stage: string) => {
    switch (stage) {
      case 'upload':
        return { icon: <FileText className="h-4 w-4" />, label: 'アップロード', color: 'text-blue-600' };
      case 'ocr':
        return { icon: <Eye className="h-4 w-4" />, label: 'OCR読み取り', color: 'text-purple-600' };
      case 'classification':
        return { icon: <Target className="h-4 w-4" />, label: '分類処理', color: 'text-orange-600' };
      case 'database':
        return { icon: <BarChart3 className="h-4 w-4" />, label: 'データ保存', color: 'text-green-600' };
      case 'done':
        return { icon: <CheckCircle className="h-4 w-4" />, label: '完了', color: 'text-green-600' };
      default:
        return { icon: <Clock className="h-4 w-4" />, label: '待機中', color: 'text-gray-600' };
    }
  };

  // 信頼度スコアの色
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // コンポーネントが非表示になったときの状態リセット
  useEffect(() => {
    if (!isVisible && isProcessingStarted) {
      setProcessingFiles([]);
      setOverallProgress(0);
      setCurrentStage('');
      setStartTime(null);
      setEstimatedTimeLeft(null);
      setIsProcessingStarted(false);
    }
  }, [isVisible, isProcessingStarted]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              OCR処理中
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              キャンセル
            </Button>
          </div>
          
          {/* 全体進捗 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{currentStage}</span>
              <div className="flex items-center gap-2">
                <span>{overallProgress}%</span>
                {estimatedTimeLeft && estimatedTimeLeft > 0 && (
                  <span className="text-muted-foreground">
                    残り約{estimatedTimeLeft}秒
                  </span>
                )}
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>処理済み: {processingFiles.filter(f => f.status === 'completed').length}/{processingFiles.length}</span>
              <span>エラー: {processingFiles.filter(f => f.status === 'error').length}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {processingFiles.map((file, index) => {
              const stageInfo = getStageInfo(file.stage);
              return (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  {/* ファイル番号 */}
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  
                  {/* ファイル情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{file.filename}</p>
                      {file.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
                    </div>
                    
                    {/* ステージ情報 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex items-center gap-1 ${stageInfo.color}`}>
                        {stageInfo.icon}
                        <span className="text-xs">{stageInfo.label}</span>
                      </div>
                      
                      {/* 抽出されたデータ */}
                      {file.extractedData && (
                        <div className="flex items-center gap-2">
                          {file.extractedData.amount && (
                            <Badge variant="outline" className="text-xs">
                              ¥{file.extractedData.amount.toLocaleString()}
                            </Badge>
                          )}
                          {file.extractedData.merchantName && (
                            <Badge variant="outline" className="text-xs">
                              {file.extractedData.merchantName}
                            </Badge>
                          )}
                          {file.extractedData.confidence && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getConfidenceColor(file.extractedData.confidence)}`}
                            >
                              信頼度{file.extractedData.confidence}%
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* プログレスバー */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          file.status === 'completed' ? 'bg-green-500' :
                          file.status === 'error' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* ステータスアイコン */}
                  <div className="flex-shrink-0">
                    {file.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {file.status === 'error' && (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    {file.status === 'processing' && (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}