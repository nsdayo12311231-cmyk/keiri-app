'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Crop, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  EyeOff, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Info,
  Maximize2
} from 'lucide-react';

interface EnhancedPreviewProps {
  files: File[];
  previews: string[];
  onFilesUpdate: (files: File[]) => void;
  onPreviewsUpdate: (previews: string[]) => void;
}

interface ImageQuality {
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
}

export function EnhancedPreview({ files, previews, onFilesUpdate, onPreviewsUpdate }: EnhancedPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [imageQualities, setImageQualities] = useState<ImageQuality[]>([]);
  const [expandedView, setExpandedView] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 画像品質を分析
  const analyzeImageQuality = (imageUrl: string, index: number): Promise<ImageQuality> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // 明度とコントラストを計算
        let totalBrightness = 0;
        let brightPixels = 0;
        let darkPixels = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const brightness = (r + g + b) / 3;
          totalBrightness += brightness;

          if (brightness > 200) brightPixels++;
          if (brightness < 50) darkPixels++;
        }

        const avgBrightness = totalBrightness / (pixels.length / 4);
        const totalPixels = pixels.length / 4;
        const brightRatio = brightPixels / totalPixels;
        const darkRatio = darkPixels / totalPixels;

        // 品質スコアを計算
        let score = 70; // 基本スコア
        const issues: string[] = [];
        const suggestions: string[] = [];

        // 明度チェック
        if (avgBrightness < 80) {
          score -= 20;
          issues.push('画像が暗すぎます');
          suggestions.push('照明を明るくして撮影してください');
        } else if (avgBrightness > 180) {
          score -= 15;
          issues.push('画像が明るすぎます');
          suggestions.push('露出を下げて撮影してください');
        } else {
          score += 10;
        }

        // コントラストチェック
        if (brightRatio > 0.3 && darkRatio > 0.1) {
          score -= 25;
          issues.push('明暗の差が大きすぎます');
          suggestions.push('均一な照明で撮影してください');
        }

        // 解像度チェック
        if (img.width < 800 || img.height < 600) {
          score -= 15;
          issues.push('解像度が低いです');
          suggestions.push('より高解像度で撮影してください');
        } else if (img.width > 2000 && img.height > 1500) {
          score += 15;
        }

        // アスペクト比チェック（レシートに適した縦長を推奨）
        const aspectRatio = img.width / img.height;
        if (aspectRatio > 1.2) {
          score -= 10;
          issues.push('横長すぎる可能性があります');
          suggestions.push('レシート全体が入るよう縦向きで撮影してください');
        }

        // 最終スコア調整
        score = Math.max(0, Math.min(100, score));

        resolve({
          score,
          issues,
          suggestions
        });
      };
      img.src = imageUrl;
    });
  };

  // プレビュー生成時に品質分析も実行
  useEffect(() => {
    const analyzeAll = async () => {
      const qualities = await Promise.all(
        previews.map((preview, index) => analyzeImageQuality(preview, index))
      );
      setImageQualities(qualities);
    };

    if (previews.length > 0) {
      analyzeAll();
    }
  }, [previews]);

  // 画像を削除
  const removeImage = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    const newQualities = imageQualities.filter((_, i) => i !== index);
    
    onFilesUpdate(newFiles);
    onPreviewsUpdate(newPreviews);
    setImageQualities(newQualities);
    
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  // 画像を90度回転
  const rotateImage = async (index: number) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // キャンバスのサイズを設定（90度回転するため幅と高さを交換）
      canvas.width = img.height;
      canvas.height = img.width;

      // 画像を中央に移動して90度回転
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // 新しいデータURLを生成
      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      // プレビューを更新
      const newPreviews = [...previews];
      newPreviews[index] = rotatedDataUrl;
      onPreviewsUpdate(newPreviews);

      // ファイルも更新（Canvas → Blob → File）
      canvas.toBlob((blob) => {
        if (blob) {
          const originalFile = files[index];
          const rotatedFile = new File([blob], originalFile.name, { 
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          const newFiles = [...files];
          newFiles[index] = rotatedFile;
          onFilesUpdate(newFiles);
        }
      }, 'image/jpeg', 0.9);
    };

    img.src = previews[index];
  };

  // 品質スコアに応じた色を取得
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // 品質スコアに応じたアイコンを取得
  const getQualityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    if (score >= 60) return <Info className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* プレビューグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {previews.map((preview, index) => {
          const quality = imageQualities[index];
          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                {/* 画像エリア */}
                <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800">
                  <img
                    src={preview}
                    alt={`プレビュー ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setExpandedView(index)}
                  />
                  
                  {/* オーバーレイコントロール */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedView(index);
                      }}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotateImage(index);
                      }}
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0 bg-red-500/80 hover:bg-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* ファイル情報 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="text-white text-xs font-medium truncate">
                      {files[index]?.name}
                    </div>
                    <div className="text-white/80 text-xs">
                      {(files[index]?.size / 1024 / 1024).toFixed(1)}MB
                    </div>
                  </div>
                </div>

                {/* 品質情報 */}
                {quality && (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">品質スコア</span>
                      <div className={`flex items-center gap-1 ${getQualityColor(quality.score)}`}>
                        {getQualityIcon(quality.score)}
                        <span className="font-bold">{quality.score}/100</span>
                      </div>
                    </div>

                    {quality.issues.length > 0 && (
                      <div className="space-y-1">
                        {quality.issues.map((issue, i) => (
                          <div key={i} className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}

                    {quality.suggestions.length > 0 && (
                      <div className="space-y-1">
                        {quality.suggestions.slice(0, 2).map((suggestion, i) => (
                          <div key={i} className="text-xs text-blue-600 dark:text-blue-400">
                            💡 {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 拡大表示モーダル */}
      {expandedView !== null && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedView(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={previews[expandedView]}
              alt={`拡大表示 ${expandedView + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              className="absolute top-4 right-4 bg-white text-black hover:bg-gray-100"
              onClick={() => setExpandedView(null)}
            >
              閉じる
            </Button>
          </div>
        </div>
      )}

      {/* サマリー情報 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            合計: {files.length}枚
          </span>
          {imageQualities.length > 0 && (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                平均品質: {Math.round(imageQualities.reduce((sum, q) => sum + q.score, 0) / imageQualities.length)}/100
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                総サイズ: {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)}MB
              </span>
            </>
          )}
        </div>
        
        {imageQualities.some(q => q.score < 70) && (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            改善推奨
          </Badge>
        )}
      </div>
    </div>
  );
}