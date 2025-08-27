'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, CreditCard, Plus } from 'lucide-react';

export default function AccountsPage() {
  const { user, loading } = useAuth();
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

  return (
    <div className="min-h-screen bg-background">
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">口座管理</h1>
                  <p className="text-muted-foreground">銀行口座・クレジットカード等の連携管理</p>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  口座を追加
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>連携アカウント</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">連携された口座がありません</p>
                    <p className="text-sm">銀行口座やクレジットカードを連携してください</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden">
        <Header />
        <main className="p-4 pb-20">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">口座管理</h1>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">連携口座がありません</p>
              </div>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}