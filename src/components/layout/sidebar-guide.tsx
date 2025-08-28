'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  PlayCircle, 
  XCircle, 
  ChevronRight, 
  ChevronLeft, 
  Lightbulb,
  ArrowDown,
  MousePointer,
  Sparkles,
  Eye,
  Navigation
} from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  animation: 'bounce' | 'glow' | 'pulse' | 'shimmer';
  actionText?: string;
  actionPath?: string;
}

interface SidebarGuideProps {
  className?: string;
}

export function SidebarGuide({ className }: SidebarGuideProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // ガイドステップの定義
  const guideSteps: GuideStep[] = [
    {
      id: 'welcome',
      title: '📱 Keiriへようこそ！',
      description: 'AI搭載の経理アプリです。左サイドバーから各機能にアクセスできます。',
      targetSelector: '.sidebar-container',
      position: 'right',
      animation: 'glow'
    },
    {
      id: 'dashboard',
      title: '📊 ダッシュボード',
      description: '収支状況や最近の取引を一目で確認できます。経理の全体像を把握しましょう。',
      targetSelector: '[data-menu="dashboard"]',
      position: 'right',
      animation: 'bounce',
      actionText: '見てみる',
      actionPath: '/dashboard'
    },
    {
      id: 'receipts',
      title: '📸 レシート管理',
      description: 'スマホで撮影するだけでAIが自動で内容を読み取り、仕訳を作成します。',
      targetSelector: '[data-menu="receipts"]',
      position: 'right',
      animation: 'pulse',
      actionText: '撮影してみる',
      actionPath: '/receipts'
    },
    {
      id: 'approval',
      title: '✅ 取引承認',
      description: 'AIが提案した取引内容を確認・承認します。精度向上のため必ず確認しましょう。',
      targetSelector: '[data-menu="approval"]',
      position: 'right',
      animation: 'shimmer',
      actionText: '承認画面へ',
      actionPath: '/approval'
    },
    {
      id: 'reports',
      title: '📈 財務レポート',
      description: '損益計算書や試算表を自動生成。確定申告に必要な書類も出力できます。',
      targetSelector: '[data-menu="reports"]',
      position: 'right',
      animation: 'glow',
      actionText: 'レポート確認',
      actionPath: '/reports'
    },
    {
      id: 'import',
      title: '📥 データ取込',
      description: '銀行明細やクレジットカードのデータを一括取込できます。',
      targetSelector: '[data-menu="import"]',
      position: 'right',
      animation: 'bounce',
      actionText: 'インポート',
      actionPath: '/import'
    }
  ];

  // 現在のステップ
  const currentGuideStep = guideSteps[currentStep];

  // ガイド開始
  const startGuide = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  // ガイド終了
  const endGuide = () => {
    setIsActive(false);
    setCurrentStep(0);
    // ハイライトを削除
    document.querySelectorAll('.guide-highlight').forEach(el => {
      el.classList.remove('guide-highlight');
    });
  };

  // 次のステップ
  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endGuide();
    }
  };

  // 前のステップ
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // ハイライト効果を適用
  useEffect(() => {
    if (isActive && currentGuideStep) {
      // 既存のハイライトを削除
      document.querySelectorAll('.guide-highlight').forEach(el => {
        el.classList.remove('guide-highlight');
      });

      // 新しいハイライトを追加
      const targetElement = document.querySelector(currentGuideStep.targetSelector);
      if (targetElement) {
        targetElement.classList.add('guide-highlight');
        
        // スクロールして要素を表示
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [isActive, currentStep, currentGuideStep]);

  // ガイドが非表示の場合、コンパクトなトリガーボタンを表示
  if (!isVisible) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 animate-simple-pulse"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          ガイド
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* ガイドコントロールパネル */}
      <div className={`fixed bottom-6 left-6 z-50 ${className}`}>
        {!isActive ? (
          <Card className="border-blue-500/30 bg-gradient-to-br from-gray-900 to-black backdrop-blur-xl animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg animate-pulse-glow">
                  <Navigation className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">🎯 アプリガイド</h3>
                  <p className="text-gray-400 text-xs">機能の使い方を学習</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={startGuide}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex-1"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  開始
                </Button>
                <Button
                  onClick={() => setIsVisible(false)}
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-500/30 bg-gradient-to-br from-gray-900 to-black backdrop-blur-xl animate-fade-in max-w-sm">
            <CardContent className="p-5">
              {/* ステップインジケーター */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="text-xs text-gray-400">
                    {currentStep + 1} / {guideSteps.length}
                  </span>
                </div>
                <Button
                  onClick={endGuide}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* プログレスバー */}
              <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${((currentStep + 1) / guideSteps.length) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/4 "></div>
                </div>
              </div>

              {/* ガイドコンテンツ */}
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2 text-lg ">
                  {currentGuideStep?.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {currentGuideStep?.description}
                </p>
              </div>

              {/* ナビゲーションボタン */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  onClick={prevStep}
                  size="sm"
                  variant="outline"
                  disabled={currentStep === 0}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  戻る
                </Button>

                <div className="flex gap-2 flex-1">
                  {currentGuideStep?.actionPath && (
                    <Button
                      onClick={() => {
                        router.push(currentGuideStep.actionPath!);
                        setTimeout(nextStep, 1000);
                      }}
                      size="sm"
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {currentGuideStep.actionText}
                    </Button>
                  )}
                  
                  <Button
                    onClick={nextStep}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {currentStep === guideSteps.length - 1 ? '完了' : '次へ'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ガイド用オーバーレイとポインター */}
      {isActive && currentGuideStep && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* アニメーション付きポインター */}
          <div className="guide-pointer animate-simple-pulse">
            <MousePointer className="h-8 w-8 text-blue-400 " />
            <ArrowDown className="h-6 w-6 text-blue-400 animate-pulse ml-2" />
          </div>
        </div>
      )}
    </>
  );
}