'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Receipt, CheckCircle, PieChart, FileText, TrendingUp, Clock, Target, Users, BookOpen, BarChart3, Settings, ChevronRight } from 'lucide-react';

interface QuickGuideProps {
  stats: {
    totalRevenue: number;
    totalExpenses: number;
    unconfirmedTransactions: number;
    businessTransactions: number;
  };
  hasTransactions?: boolean;
}

interface StepItem {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  detailSteps: string[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
}

interface GuideItem {
  id: string;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  actionText: string;
  actionPath: string;
  priority: 'high' | 'medium' | 'low';
  condition: boolean;
}

export function QuickGuide({ stats, hasTransactions = false }: QuickGuideProps) {
  const router = useRouter();
  
  // 初心者向けステップガイド
  const beginnerSteps: StepItem[] = [
    {
      id: 'setup',
      stepNumber: 1,
      title: '初期設定を完了',
      description: 'プロフィール情報と事業内容を設定',
      detailSteps: [
        'プロフィール→基本情報から個人情報を入力',
        '事業の種類と開始日を登録',
        '税務設定で消費税の取り扱いを選択'
      ],
      estimatedTime: '5分',
      difficulty: 'easy',
      completed: hasTransactions
    },
    {
      id: 'first-receipt',
      stepNumber: 2,
      title: '最初のレシートを撮影',
      description: 'レシート機能でAI自動処理を体験',
      detailSteps: [
        'レシート管理ページを開く',
        'スマホでレシートを撮影',
        'AI分析結果を確認して承認'
      ],
      estimatedTime: '3分',
      difficulty: 'easy',
      completed: hasTransactions
    },
    {
      id: 'review-transactions',
      stepNumber: 3,
      title: '取引データを確認',
      description: '自動分類された取引をチェック',
      detailSteps: [
        '承認ページで未確認取引をチェック',
        '事業用・私用の分類を確認',
        '必要に応じて修正・承認'
      ],
      estimatedTime: '10分',
      difficulty: 'medium',
      completed: stats.unconfirmedTransactions === 0
    },
    {
      id: 'generate-reports',
      stepNumber: 4,
      title: '財務レポートを確認',
      description: '損益計算書で収支状況を把握',
      detailSteps: [
        'レポートページを開く',
        '損益計算書で収益・費用を確認',
        'CSVエクスポートで会計ソフトに連携'
      ],
      estimatedTime: '5分',
      difficulty: 'medium',
      completed: stats.totalExpenses > 0 || stats.totalRevenue > 0
    }
  ];

  // 通常のガイド項目
  const guideItems: GuideItem[] = [
    {
      id: 'unconfirmed',
      icon: AlertCircle,
      title: '取引の確認が必要です',
      description: `${stats.unconfirmedTransactions}件の取引内容をご確認ください`,
      actionText: '確認する',
      actionPath: '/approval',
      priority: 'high',
      condition: stats.unconfirmedTransactions > 0
    },
    {
      id: 'bulk-import',
      icon: TrendingUp,
      title: 'データを一括インポート',
      description: '銀行明細やクレジットカード履歴を効率的に取込',
      actionText: 'インポート',
      actionPath: '/import',
      priority: 'medium',
      condition: hasTransactions && stats.unconfirmedTransactions < 5
    },
    {
      id: 'monthly-reports',
      icon: BarChart3,
      title: '今月の財務状況をチェック',
      description: '損益計算書で収支バランスを把握しましょう',
      actionText: 'レポート確認',
      actionPath: '/reports/profit-loss',
      priority: 'medium',
      condition: stats.totalExpenses > 10000 || stats.totalRevenue > 10000
    },
    {
      id: 'tax-preparation',
      icon: FileText,
      title: '確定申告の準備',
      description: '必要書類の出力と税務計算を実行',
      actionText: '税務ページ',
      actionPath: '/tax',
      priority: 'low',
      condition: stats.businessTransactions > 20
    },
    {
      id: 'settings-optimization',
      icon: Settings,
      title: '設定を最適化',
      description: 'カスタムルールで自動分類の精度を向上',
      actionText: '設定画面',
      actionPath: '/settings',
      priority: 'low',
      condition: hasTransactions
    }
  ];

  // 初心者かどうかの判定（取引数が少ない場合）
  const isBeginnerUser = !hasTransactions || stats.businessTransactions < 10;
  
  // 完了したステップ数
  const completedSteps = beginnerSteps.filter(step => step.completed).length;
  const totalSteps = beginnerSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
  
  // 条件を満たすアイテムを優先度順で表示
  const activeItems = guideItems
    .filter(item => item.condition)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200';
      case 'medium': return 'border-blue-200';
      case 'low': return 'border-green-200';
      default: return 'border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // 初心者の場合はスタートガイドを表示
  if (isBeginnerUser && completedSteps < totalSteps) {
    return (
      <Card className="border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-black backdrop-blur-xl relative overflow-hidden animate-fade-in">
        {/* アニメーション付きネオンアクセント */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/3 "></div>
        </div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl "></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl " style={{animationDelay: '1s'}}></div>
        
        <CardHeader className="pb-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 ">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30 backdrop-blur-sm animate-simple-pulse">
                <BookOpen className="h-5 w-5 text-blue-400 " />
              </div>
              <div>
                <CardTitle className="text-lg text-white font-semibold ">
                  🎯 スタートガイド
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  経理アプリを始めるためのステップ
                </CardDescription>
              </div>
            </div>
            <div className="text-right animate-fade-in" style={{animationDelay: '0.2s'}}>
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                {progressPercentage}%
              </div>
              <div className="text-xs text-gray-500">完了</div>
            </div>
          </div>
          
          {/* アニメーション付きプログレスバー */}
          <div className="mt-4 relative animate-fade-in" style={{animationDelay: '0.4s'}}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-300">進捗状況</span>
              <span className="text-sm text-gray-400 animate-pulse">{completedSteps}/{totalSteps}ステップ</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 border border-gray-700 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden "
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/4 "></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative">
          {beginnerSteps.map((step, index) => (
            <div
              key={step.id}
              className={`relative p-5 rounded-2xl border transition-all duration-500 backdrop-blur-sm animate-fade-in ${
                step.completed 
                  ? 'bg-green-900/30 border-green-500/30 shadow-lg shadow-green-500/10' 
                  : index === completedSteps 
                    ? 'bg-blue-900/40 border-blue-500/50 shadow-xl shadow-blue-500/20 ring-1 ring-blue-500/30 animate-simple-pulse' 
                    : 'bg-gray-800/50 border-gray-600/30 opacity-70'
              }`}
              style={{animationDelay: `${0.1 * index + 0.6}s`}}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step.completed 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 ' 
                    : index === completedSteps
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 animate-simple-pulse'
                      : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}>
                  {step.completed ? <CheckCircle className="h-5 w-5 " /> : <span className="animate-pulse">{step.stepNumber}</span>}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className={`font-semibold text-sm ${step.completed ? 'text-green-400' : index === completedSteps ? 'text-blue-300' : 'text-gray-400'}`}>
                      {step.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${
                        step.difficulty === 'easy' 
                          ? 'bg-green-900/50 text-green-400 border-green-500/30' 
                          : step.difficulty === 'medium' 
                            ? 'bg-amber-900/50 text-amber-400 border-amber-500/30'
                            : 'bg-red-900/50 text-red-400 border-red-500/30'
                      }`}>
                        {step.difficulty === 'easy' ? '簡単' : step.difficulty === 'medium' ? '普通' : '上級'}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-lg">
                        <Clock className="h-3 w-3" />
                        {step.estimatedTime}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-3 leading-relaxed">{step.description}</p>
                  
                  {index === completedSteps && !step.completed && (
                    <div className="space-y-3 bg-gray-900/60 rounded-xl p-4 border border-blue-500/20">
                      <h5 className="text-xs font-medium text-blue-300 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        やることリスト:
                      </h5>
                      <ul className="space-y-2">
                        {step.detailSteps.map((detailStep, stepIndex) => (
                          <li key={stepIndex} className="text-xs text-gray-300 flex items-start gap-3">
                            <span className="text-blue-400 font-bold mt-1">•</span>
                            <span className="flex-1 leading-relaxed">{detailStep}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button
                        size="sm"
                        onClick={() => router.push(step.id === 'setup' ? '/profile' : '/receipts')}
                        className="mt-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40 animate-simple-pulse"
                      >
                        今すぐ始める
                        <ChevronRight className="ml-1 h-4 w-4 " />
                      </Button>
                    </div>
                  )}
                  
                  {step.completed && (
                    <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/30 px-3 py-2 rounded-lg border border-green-500/30">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">完了済み</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // すべて完了している場合
  if (activeItems.length === 0 && completedSteps === totalSteps) {
    return (
      <Card className="border-green-500/30 bg-gradient-to-br from-gray-900 via-green-900/20 to-black backdrop-blur-xl relative overflow-hidden">
        {/* 成功のオーラ効果 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        
        <CardHeader className="pb-3 relative">
          <div className="flex items-center gap-3">
            <div className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/40 backdrop-blur-sm">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white font-bold">
                🎉 素晴らしい！すべて完了です
              </CardTitle>
              <CardDescription className="text-green-400">
                基本的な経理作業がすべて最新の状態です
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              おめでとうございます！現在の経理作業はすべて完了しています。
              新しい取引があったら、レシート撮影や手動入力で記録しましょう。
            </p>
            <div className="flex gap-3">
              <Button size="sm" onClick={() => router.push('/receipts')} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-500/25">
                <Receipt className="mr-2 h-4 w-4" />
                レシート追加
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push('/reports')} className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400">
                <BarChart3 className="mr-2 h-4 w-4" />
                レポート確認
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 通常の経験者向けガイド
  return (
    <Card className="border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-black backdrop-blur-xl relative overflow-hidden animate-fade-in">
      {/* アニメーション付きプロフェッショナルアクセント */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/3 "></div>
      </div>
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl "></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl " style={{animationDelay: '1.5s'}}></div>
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 ">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 backdrop-blur-sm animate-simple-pulse">
              <Target className="h-6 w-6 text-cyan-400 " />
            </div>
            <div>
              <CardTitle className="text-xl text-white font-semibold ">
                📝 次にやること
              </CardTitle>
              <CardDescription className="text-gray-400">
                経理作業をスムーズに進めるための提案です
              </CardDescription>
            </div>
          </div>
          <div className="text-right bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-600/50 backdrop-blur-sm animate-fade-in" style={{animationDelay: '0.2s'}}>
            <div className="text-sm text-gray-400">進行中のタスク</div>
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent animate-pulse">{activeItems.length}件</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5 relative">
        {activeItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`group p-5 rounded-2xl border transition-all duration-500 backdrop-blur-sm hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.03] animate-fade-in ${
                item.priority === 'high' 
                  ? 'bg-gradient-to-r from-red-900/30 to-orange-900/20 border-red-500/30 hover:border-red-400/60 animate-simple-pulse' 
                  : item.priority === 'medium' 
                    ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border-blue-500/30 hover:border-blue-400/60' 
                    : 'bg-gradient-to-r from-gray-800/50 to-gray-700/30 border-gray-600/30 hover:border-gray-500/60'
              }`}
              style={{animationDelay: `${0.1 * index + 0.4}s`}}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-4 rounded-2xl flex-shrink-0 group-hover:scale-125 transition-all duration-500 border ${
                    item.priority === 'high' 
                      ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/40 text-red-400 ' 
                      : item.priority === 'medium' 
                        ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-400 ' 
                        : 'bg-gradient-to-br from-gray-600/20 to-gray-500/20 border-gray-500/40 text-gray-400'
                  }`}>
                    <Icon className="h-6 w-6 group-hover:" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-white text-base">
                        {item.title}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        item.priority === 'high' 
                          ? 'bg-red-900/50 text-red-300 border-red-500/50' 
                          : item.priority === 'medium'
                            ? 'bg-blue-900/50 text-blue-300 border-blue-500/50'
                            : 'bg-gray-800/50 text-gray-300 border-gray-500/50'
                      }`}>
                        {item.priority === 'high' ? '重要' : item.priority === 'medium' ? '推奨' : 'オプション'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(item.actionPath)}
                  className={`flex-shrink-0 group-hover:shadow-xl transition-all duration-500 hover:scale-110 ${
                    item.priority === 'high' 
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white border-0 shadow-lg shadow-red-500/25 hover:shadow-red-500/50 animate-simple-pulse' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/50'
                  }`}
                >
                  {item.actionText}
                  <ChevronRight className="ml-1 h-4 w-4 group-hover:" />
                </Button>
              </div>
            </div>
          );
        })}
        
        {/* アニメーション付き追加のヒント */}
        <div className="mt-8 p-5 bg-gradient-to-r from-gray-800/60 to-gray-900/40 rounded-2xl border border-gray-600/30 backdrop-blur-sm relative overflow-hidden animate-fade-in" style={{animationDelay: `${0.1 * activeItems.length + 0.6}s`}}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500/50 to-blue-500/50">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/4 "></div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 flex-shrink-0 ">
              <Users className="h-5 w-5 text-cyan-400 " />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-base text-cyan-300 mb-2 flex items-center gap-2 " style={{animationDelay: `${0.1 * activeItems.length + 0.8}s`}}>
                💡 プロフェッショナルヒント
              </h5>
              <p className="text-sm text-gray-300 leading-relaxed animate-fade-in" style={{animationDelay: `${0.1 * activeItems.length + 1.0}s`}}>
                定期的にレシート撮影と取引確認を行うことで、確定申告時の作業負荷を大幅に削減できます。
                週に1-2回のペースで更新することをおすすめします。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}