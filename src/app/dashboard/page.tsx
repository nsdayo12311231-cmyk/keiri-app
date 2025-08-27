'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Receipt, PieChart, TrendingUp, Calculator, Building2, User, Calendar, ArrowRight } from 'lucide-react';
import { ExpenseChart } from '@/components/dashboard/expense-chart';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  unconfirmedTransactions: number;
  businessTransactions: number;
}

interface ExpenseData {
  category: string;
  amount: number;
  count: number;
  color: string;
}

interface MonthlyData {
  month: string;
  expense: number;
  revenue: number;
}

interface RecentTransaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  is_business: boolean;
  transaction_type: 'expense' | 'revenue';
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    unconfirmedTransactions: 0,
    businessTransactions: 0,
  });
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // 今月の取引データを取得
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // getMonth() は 0-based なので +1
        
        const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const startOfNextMonth = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
        
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select(`
            amount, 
            is_business, 
            is_confirmed, 
            transaction_type, 
            category_id,
            account_categories (
              name,
              code,
              category_type
            )
          `)
          .eq('user_id', user.id)
          .gte('transaction_date', startOfMonth)
          .lt('transaction_date', startOfNextMonth);

        if (error) {
          console.error('Error fetching transactions:', error);
          return;
        }

        // 統計を計算
        const expenses = transactions?.filter(tx => tx.transaction_type === 'expense') || [];
        const revenues = transactions?.filter(tx => tx.transaction_type === 'revenue') || [];
        
        const newStats: DashboardStats = {
          totalRevenue: revenues.reduce((total, tx) => total + Number(tx.amount), 0),
          totalExpenses: expenses.reduce((total, tx) => total + Number(tx.amount), 0),
          unconfirmedTransactions: transactions?.filter(tx => !tx.is_confirmed).length || 0,
          businessTransactions: transactions?.filter(tx => tx.is_business).length || 0,
        };

        // 支出内訳データを作成
        const categoryMap = new Map();
        expenses.forEach(tx => {
          const categoryName = tx.account_categories?.name || '未分類';
          if (categoryMap.has(categoryName)) {
            const existing = categoryMap.get(categoryName);
            categoryMap.set(categoryName, {
              ...existing,
              amount: existing.amount + Number(tx.amount),
              count: existing.count + 1
            });
          } else {
            categoryMap.set(categoryName, {
              category: categoryName,
              amount: Number(tx.amount),
              count: 1,
              color: '#0088FE'
            });
          }
        });

        const expenseChartData = Array.from(categoryMap.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10); // トップ10

        // 過去6ヶ月のデータを取得（簡略版）
        const monthlyChartData = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - i);
          const monthStr = `${monthDate.getMonth() + 1}月`;
          
          monthlyChartData.push({
            month: monthStr,
            expense: Math.floor(Math.random() * 100000), // 仮データ
            revenue: Math.floor(Math.random() * 150000)   // 仮データ
          });
        }

        setStats(newStats);
        setExpenseData(expenseChartData);
        setMonthlyData(monthlyChartData);
        
        // 最近の取引を取得（最新5件）
        const { data: recentTx, error: recentError } = await supabase
          .from('transactions')
          .select('id, amount, description, transaction_date, is_business, transaction_type')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (!recentError && recentTx) {
          setRecentTransactions(recentTx);
        }
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
    };

    fetchStats();
  }, [user]);

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

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number, type: 'expense' | 'revenue') => {
    const sign = type === 'expense' ? '-' : '+';
    return `${sign}¥${amount.toLocaleString()}`;
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
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  ダッシュボード
                </h1>
                <p className="text-muted-foreground">
                  {user.email} としてログイン中
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      今月の収入
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">+¥{stats.totalRevenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      収入合計
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      今月の支出
                    </CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">-¥{stats.totalExpenses.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      支出合計
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      今月の収支
                    </CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      stats.totalRevenue - stats.totalExpenses >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {stats.totalRevenue - stats.totalExpenses >= 0 ? '+' : ''}¥{(stats.totalRevenue - stats.totalExpenses).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      収支差額
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      事業取引
                    </CardTitle>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.businessTransactions}件</div>
                    <p className="text-xs text-muted-foreground">
                      今月の事業取引数
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* チャート表示 */}
              <div className="mt-8">
                <ExpenseChart expenseData={expenseData} monthlyData={monthlyData} />
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>最近の取引</CardTitle>
                        <CardDescription>
                          直近の取引履歴を表示します
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/transactions')}
                        className="text-xs"
                      >
                        すべて見る
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentTransactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">まだ取引データがありません</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentTransactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => router.push('/transactions')}
                          >
                            <div className="flex items-center gap-3">
                              {transaction.is_business ? (
                                <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <User className="h-4 w-4 text-green-600 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {transaction.description}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(transaction.transaction_date)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-semibold text-sm ${
                                transaction.transaction_type === 'expense' 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {formatAmount(transaction.amount, transaction.transaction_type)}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {transaction.is_business ? '事業' : '個人'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>クイックアクション</CardTitle>
                    <CardDescription>
                      よく使用する機能への快速アクセス
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => router.push('/receipts')}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      レシートを撮影
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => router.push('/transactions')}
                    >
                      <PieChart className="mr-2 h-4 w-4" />
                      取引を手動入力
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleSignOut}
                    >
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
            <h1 className="text-2xl font-bold text-foreground mb-2">
              ダッシュボード
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">今月の収入</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-green-600">+¥{stats.totalRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">今月の支出</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-red-600">-¥{stats.totalExpenses.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">今月の収支</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                stats.totalRevenue - stats.totalExpenses >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {stats.totalRevenue - stats.totalExpenses >= 0 ? '+' : ''}¥{(stats.totalRevenue - stats.totalExpenses).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                収支差額 • 事業取引 {stats.businessTransactions}件
              </p>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">最近の取引</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/transactions')}
                  className="text-xs"
                >
                  すべて見る
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">まだ取引データがありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.slice(0, 3).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer"
                      onClick={() => router.push('/transactions')}
                    >
                      <div className="flex items-center gap-2">
                        {transaction.is_business ? (
                          <Building2 className="h-3 w-3 text-blue-600" />
                        ) : (
                          <User className="h-3 w-3 text-green-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.transaction_date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-xs ${
                          transaction.transaction_type === 'expense' 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {formatAmount(transaction.amount, transaction.transaction_type)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full"
                onClick={() => router.push('/receipts')}
              >
                <Receipt className="mr-2 h-4 w-4" />
                レシートを撮影
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/transactions')}
              >
                <PieChart className="mr-2 h-4 w-4" />
                取引を手動入力
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}