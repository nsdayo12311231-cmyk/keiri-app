'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { 
  Calculator, 
  LogOut, 
  Settings,
  User,
  Briefcase,
  DollarSign,
  FileText,
  Shield,
  Bell,
  Palette,
  ChevronRight,
  Edit,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href?: string;
  action?: () => void;
  status?: 'completed' | 'incomplete' | 'warning';
  badge?: string;
}

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('success', 'ログアウト完了', 'ログアウトしました');
      router.push('/');
    } catch (error) {
      showToast('error', 'エラー', 'ログアウト中にエラーが発生しました');
    }
  };

  const settingsSections: SettingsSection[] = [
    {
      id: 'profile-basic',
      title: '基本プロフィール',
      description: '氏名、メールアドレス等の基本情報',
      icon: User,
      href: '/profile/basic',
      status: user?.email ? 'completed' : 'incomplete'
    },
    {
      id: 'profile-detailed',
      title: '詳細プロフィール設定',
      description: '業種、働き方、事業形態等の詳細設定',
      icon: Briefcase,
      href: '/profile/setup',
      status: 'incomplete', // TODO: 実際の設定状況をチェック
      badge: '重要'
    },
    {
      id: 'expense-preferences',
      title: '経費設定',
      description: '自動分類のためのカテゴリ別経費設定',
      icon: DollarSign,
      href: '/profile/expenses',
      status: 'incomplete' // TODO: 実際の設定状況をチェック
    },
    {
      id: 'custom-rules',
      title: 'カスタム分類ルール',
      description: '特定の店舗・キーワードの分類ルール',
      icon: FileText,
      href: '/settings/custom-rules',
      status: 'completed'
    },
    {
      id: 'tax-settings',
      title: '税務・申告設定',
      description: '青色申告、消費税等の税務関連設定',
      icon: Calculator,
      href: '/profile/tax',
      status: 'incomplete'
    },
    {
      id: 'security',
      title: 'セキュリティ',
      description: 'パスワード変更、2段階認証等',
      icon: Shield,
      href: '/settings/security',
      status: 'warning'
    },
    {
      id: 'notifications',
      title: '通知設定',
      description: 'メール通知、プッシュ通知の設定',
      icon: Bell,
      href: '/settings/notifications',
      status: 'completed'
    },
    {
      id: 'appearance',
      title: '表示設定',
      description: 'テーマ、言語、表示形式の設定',
      icon: Palette,
      href: '/settings/appearance',
      status: 'completed'
    },
  ];

  const getStatusIcon = (status?: 'completed' | 'incomplete' | 'warning') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'incomplete':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">設定</h1>
                  <p className="text-muted-foreground">
                    アカウント設定と経費管理の設定を行ってください
                  </p>
                </div>
              </div>

              {/* ユーザー情報カード */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    アカウント情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">メールアドレス</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        編集
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        ログアウト
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 設定セクション一覧 */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground mb-4">設定項目</h2>
                
                <div className="grid gap-4">
                  {settingsSections.map((section) => {
                    const IconComponent = section.icon;
                    return (
                      <Card key={section.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {section.href ? (
                            <Link href={section.href}>
                              <div className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <IconComponent className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                        {section.title}
                                      </h3>
                                      {section.badge && (
                                        <Badge variant="secondary" className="text-xs">
                                          {section.badge}
                                        </Badge>
                                      )}
                                      {getStatusIcon(section.status)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {section.description}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            </Link>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <IconComponent className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-foreground">
                                      {section.title}
                                    </h3>
                                    {section.badge && (
                                      <Badge variant="secondary" className="text-xs">
                                        {section.badge}
                                      </Badge>
                                    )}
                                    {getStatusIcon(section.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {section.description}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline" 
                                size="sm"
                                onClick={section.action}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* 初期設定ガイド */}
              <Card className="mt-8 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Settings className="h-5 w-5" />
                    初期設定のお勧め
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      🎯 より正確な経費自動分類のために、以下の設定を完了することをお勧めします：
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>1️⃣ <strong>詳細プロフィール設定</strong> - 業種・働き方の設定</li>
                      <li>2️⃣ <strong>経費設定</strong> - カテゴリ別の自動分類ルール</li>
                      <li>3️⃣ <strong>税務・申告設定</strong> - 青色申告等の税務情報</li>
                    </ul>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" asChild>
                        <Link href="/profile/setup">
                          設定を始める
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden pb-16">
        <main className="p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">設定</h1>
            <p className="text-muted-foreground text-sm">
              アカウント設定と経費管理の設定
            </p>
          </div>

          {/* ユーザー情報カード */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">メールアドレス</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 主要な設定項目（モバイル向け簡略版） */}
          <div className="space-y-3">
            <Card>
              <CardContent className="p-0">
                <Link href="/profile/basic" className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">基本プロフィール</h3>
                      <p className="text-sm text-muted-foreground">氏名、事業形態等</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Link href="/profile/setup" className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">詳細プロフィール</h3>
                      <p className="text-sm text-muted-foreground">業種、働き方等</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Link href="/profile/expenses" className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">経費設定</h3>
                      <p className="text-sm text-muted-foreground">自動分類設定</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Link href="/profile/tax" className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">税務設定</h3>
                      <p className="text-sm text-muted-foreground">申告方法等</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}