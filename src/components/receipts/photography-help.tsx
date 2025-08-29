'use client';

import { Camera, CheckCircle, XCircle, Lightbulb, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PhotographyHelpProps {
  className?: string;
}

export function PhotographyHelp({ className }: PhotographyHelpProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const tips = [
    {
      icon: CheckCircle,
      title: '明るい場所で撮影',
      description: '自然光や十分な照明のある場所で撮影してください',
      example: '窓際や電気スタンドの下がおすすめです',
      type: 'good' as const
    },
    {
      icon: CheckCircle,
      title: 'レシート全体を画面に入れる',
      description: 'レシートの端が切れないよう、全体が見えるように撮影',
      example: 'スマホを少し離して、余白も含めて撮影しましょう',
      type: 'good' as const
    },
    {
      icon: CheckCircle,
      title: 'レシートを平らにする',
      description: 'しわや折り目をできるだけ伸ばして撮影',
      example: '机などの平らな場所に置いて撮影してください',
      type: 'good' as const
    },
    {
      icon: CheckCircle,
      title: '文字がはっきり見える',
      description: 'ピントを合わせて、文字が読める状態で撮影',
      example: 'カメラが自動でピントを合わせるまで少し待ちましょう',
      type: 'good' as const
    }
  ];

  const commonMistakes = [
    {
      icon: XCircle,
      title: '暗すぎる写真',
      description: '文字が読めないほど暗い環境での撮影',
      solution: '明るい場所に移動するか、フラッシュを使用してください',
      type: 'bad' as const
    },
    {
      icon: XCircle,
      title: 'レシートが切れている',
      description: '重要な部分（金額や日付）が画面から外れている',
      solution: 'カメラを少し離して、レシート全体が入るように調整',
      type: 'bad' as const
    },
    {
      icon: XCircle,
      title: 'ぶれている写真',
      description: '手ぶれで文字がぼやけて読めない',
      solution: 'スマホをしっかり固定し、シャッターを押すときは動かさない',
      type: 'bad' as const
    }
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">📸 撮影のコツ</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? '閉じる' : '詳しく見る'}
          </Button>
        </div>
        <CardDescription>
          きれいに撮影すると、より正確に読み取れます
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 基本のコツ（常に表示） */}
        <div className="grid gap-3 sm:grid-cols-2">
          {tips.slice(0, 2).map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Icon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="font-medium text-green-800 text-sm leading-tight">
                    {tip.title}
                  </h4>
                  <p className="text-green-700 text-xs mt-1 leading-relaxed">
                    {tip.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 詳細情報（展開時のみ） */}
        {isExpanded && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {/* 追加のコツ */}
            <div>
              <h3 className="flex items-center gap-2 font-medium text-sm text-foreground mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                さらに詳しいコツ
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {tips.slice(2).map((tip, index) => {
                  const Icon = tip.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <Icon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h4 className="font-medium text-green-800 text-sm leading-tight">
                          {tip.title}
                        </h4>
                        <p className="text-green-700 text-xs mt-1 leading-relaxed">
                          {tip.description}
                        </p>
                        <p className="text-green-600 text-xs mt-1 italic">
                          💡 {tip.example}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* よくある失敗例 */}
            <div>
              <h3 className="flex items-center gap-2 font-medium text-sm text-foreground mb-3">
                <Info className="h-4 w-4 text-blue-500" />
                避けたい失敗例
              </h3>
              <div className="space-y-3">
                {commonMistakes.map((mistake, index) => {
                  const Icon = mistake.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <Icon className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-red-800 text-sm leading-tight">
                          {mistake.title}
                        </h4>
                        <p className="text-red-700 text-xs mt-1 leading-relaxed">
                          {mistake.description}
                        </p>
                        <div className="mt-2 p-2 bg-white/50 rounded border border-red-200">
                          <p className="text-red-800 text-xs leading-relaxed">
                            <strong>解決方法:</strong> {mistake.solution}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 読み取れる情報の説明 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="flex items-center gap-2 font-medium text-sm text-blue-800 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                自動で読み取る情報
              </h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>金額:</strong> 合計金額を自動検出</li>
                <li>• <strong>店舗名:</strong> レシートに印刷された店舗情報</li>
                <li>• <strong>日付:</strong> 取引日時</li>
                <li>• <strong>商品・サービス:</strong> 購入した内容</li>
                <li>• <strong>分類:</strong> AIが事業用・個人用を自動判定</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2 italic">
                💡 読み取り結果はあとから修正できるので、気軽に撮影してください
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}