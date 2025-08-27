'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

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

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">設定</h1>
                <p className="text-muted-foreground">アカウント・アプリの設定を管理します</p>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>アカウント情報</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          メールアドレス
                        </label>
                        <p className="text-foreground">{user.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>アカウント管理</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      onClick={handleSignOut}
                      className="w-full sm:w-auto"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      ログアウト
                    </Button>
                  </CardContent>
                </Card>
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
            <h1 className="text-2xl font-bold text-foreground">設定</h1>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">アカウント</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm text-muted-foreground">メール</label>
                  <p className="text-foreground">{user.email}</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                  className="w-full"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}