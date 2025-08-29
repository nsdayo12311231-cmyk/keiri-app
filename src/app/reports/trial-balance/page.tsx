'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calculator, 
  FileText, 
  Download, 
  ArrowLeft, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Scale
} from 'lucide-react';
import Link from 'next/link';

interface TrialBalanceEntry {
  account_id: string;
  account_name: string;
  account_code?: string;
  category_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
}

interface TrialBalanceData {
  entries: TrialBalanceEntry[];
  totals: {
    total_debits: number;
    total_credits: number;
    assets: number;
    liabilities: number;
    equity: number;
    revenues: number;
    expenses: number;
  };
  period: string;
  is_balanced: boolean;
}

export default function TrialBalancePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchTrialBalance();
    }
  }, [user, selectedPeriod]);

  const getPeriodDates = (period: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (period) {
      case 'current_month':
        return {
          start: new Date(year, month, 1).toISOString().split('T')[0],
          end: new Date(year, month + 1, 0).toISOString().split('T')[0],
          label: `${year}年${month + 1}月`
        };
      case 'last_month':
        return {
          start: new Date(year, month - 1, 1).toISOString().split('T')[0],
          end: new Date(year, month, 0).toISOString().split('T')[0],
          label: `${year}年${month}月`
        };
      case 'current_year':
        return {
          start: new Date(year, 0, 1).toISOString().split('T')[0],
          end: new Date(year, 11, 31).toISOString().split('T')[0],
          label: `${year}年`
        };
      case 'last_year':
        return {
          start: new Date(year - 1, 0, 1).toISOString().split('T')[0],
          end: new Date(year - 1, 11, 31).toISOString().split('T')[0],
          label: `${year - 1}年`
        };
      default:
        return {
          start: new Date(year, month, 1).toISOString().split('T')[0],
          end: new Date(year, month + 1, 0).toISOString().split('T')[0],
          label: `${year}年${month + 1}月`
        };
    }
  };

  const fetchTrialBalance = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { start, end, label } = getPeriodDates(selectedPeriod);

      // 勘定科目マスターを取得
      const { data: accountCategories, error: categoriesError } = await supabase
        .from('account_categories')
        .select('id, name, code, category_type')
        .order('category_type')
        .order('name');

      if (categoriesError) throw categoriesError;

      // 期間内の取引データを取得
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          amount,
          category_id,
          is_confirmed,
          account_categories!inner (
            id,
            name,
            code,
            category_type
          )
        `)
        .eq('user_id', user.id)
        .eq('is_confirmed', true)
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      if (transactionsError) throw transactionsError;

      console.log('Trial Balance data:', { transactions, accountCategories });

      // 各勘定科目の残高を計算
      const balanceMap = new Map<string, {
        account: any;
        debit_total: number;
        credit_total: number;
      }>();

      // 勘定科目マスターで初期化
      accountCategories?.forEach(account => {
        balanceMap.set(account.id, {
          account,
          debit_total: 0,
          credit_total: 0
        });
      });

      // 取引データから残高を計算
      transactions?.forEach(transaction => {
        const categoryId = transaction.category_id;
        if (!categoryId || !balanceMap.has(categoryId)) return;

        const entry = balanceMap.get(categoryId)!;
        const amount = Math.abs(transaction.amount);

        // 複式簿記の原則に従って借方・貸方を決定
        const categoryType = transaction.account_categories.category_type;
        const transactionType = Number(transaction.amount) < 0 ? 'expense' : 'revenue';

        if (transactionType === 'expense') {
          // 支出の場合
          if (categoryType === 'expense') {
            // 費用勘定: 借方に計上
            entry.debit_total += amount;
          } else if (categoryType === 'asset') {
            // 資産勘定: 現金減少なので貸方
            entry.credit_total += amount;
          }
        } else if (transactionType === 'revenue') {
          // 収入の場合  
          if (categoryType === 'revenue') {
            // 収益勘定: 貸方に計上
            entry.credit_total += amount;
          } else if (categoryType === 'asset') {
            // 資産勘定: 現金増加なので借方
            entry.debit_total += amount;
          }
        }
      });

      // 試算表エントリを作成
      const entries: TrialBalanceEntry[] = [];
      let totalDebits = 0;
      let totalCredits = 0;
      let assets = 0, liabilities = 0, equity = 0, revenues = 0, expenses = 0;

      balanceMap.forEach((balance, accountId) => {
        const { account, debit_total, credit_total } = balance;
        const net_balance = debit_total - credit_total;

        // 残高がある勘定科目のみ表示
        if (debit_total > 0 || credit_total > 0) {
          entries.push({
            account_id: accountId,
            account_name: account.name,
            account_code: account.code,
            category_type: account.category_type,
            debit_balance: debit_total,
            credit_balance: credit_total,
            net_balance
          });

          totalDebits += debit_total;
          totalCredits += credit_total;

          // 勘定科目タイプ別集計
          switch (account.category_type) {
            case 'asset':
              assets += net_balance;
              break;
            case 'liability':
              liabilities += -net_balance;
              break;
            case 'equity':
              equity += -net_balance;
              break;
            case 'revenue':
              revenues += -net_balance;
              break;
            case 'expense':
              expenses += net_balance;
              break;
          }
        }
      });

      // カテゴリ別、残高順でソート
      entries.sort((a, b) => {
        if (a.category_type !== b.category_type) {
          const typeOrder = ['asset', 'liability', 'equity', 'revenue', 'expense'];
          return typeOrder.indexOf(a.category_type) - typeOrder.indexOf(b.category_type);
        }
        return Math.abs(b.net_balance) - Math.abs(a.net_balance);
      });

      setTrialBalanceData({
        entries,
        totals: {
          total_debits: totalDebits,
          total_credits: totalCredits,
          assets,
          liabilities,
          equity,
          revenues,
          expenses
        },
        period: label,
        is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
      });

    } catch (error) {
      console.error('試算表データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const getCategoryLabel = (type: string) => {
    const labels = {
      asset: '資産',
      liability: '負債',
      equity: '純資産',
      revenue: '収益',
      expense: '費用'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getCategoryColor = (type: string) => {
    const colors = {
      asset: 'text-blue-600',
      liability: 'text-red-600',
      equity: 'text-green-600',
      revenue: 'text-purple-600',
      expense: 'text-orange-600'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600';
  };

  const exportTrialBalance = () => {
    if (!trialBalanceData) return;

    const csvContent = [
      // ヘッダー
      '勘定科目,科目コード,種別,借方残高,貸方残高,差引残高',
      // データ
      ...trialBalanceData.entries.map(entry => 
        `${entry.account_name},${entry.account_code || ''},${getCategoryLabel(entry.category_type)},${entry.debit_balance},${entry.credit_balance},${entry.net_balance}`
      ),
      // 合計行
      `合計,,,'${trialBalanceData.totals.total_debits},'${trialBalanceData.totals.total_credits},${trialBalanceData.totals.total_debits - trialBalanceData.totals.total_credits}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.download = `試算表_${trialBalanceData.period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              {/* ヘッダー */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <Link href="/reports">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      レポートに戻る
                    </Button>
                  </Link>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">試算表</h1>
                    <p className="text-muted-foreground">
                      各勘定科目の借方・貸方残高を確認できます
                    </p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current_month">今月</SelectItem>
                        <SelectItem value="last_month">先月</SelectItem>
                        <SelectItem value="current_year">今年</SelectItem>
                        <SelectItem value="last_year">昨年</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={exportTrialBalance} 
                      disabled={!trialBalanceData}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      CSV出力
                    </Button>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">試算表を作成中...</p>
                </div>
              ) : trialBalanceData ? (
                <div className="space-y-6">
                  {/* サマリーカード */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className={`border-0 ${
                      trialBalanceData.is_balanced 
                        ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900' 
                        : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900'
                    }`}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
                          trialBalanceData.is_balanced ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                        }`}>
                          <Scale className="h-4 w-4" />
                          貸借バランス
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-lg font-bold ${
                          trialBalanceData.is_balanced ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trialBalanceData.is_balanced ? '✓ 一致' : '✗ 不一致'}
                        </div>
                        <p className={`text-xs mt-1 ${
                          trialBalanceData.is_balanced ? 'text-green-600/70' : 'text-red-600/70'
                        }`}>
                          差額: {formatCurrency(Math.abs(trialBalanceData.totals.total_debits - trialBalanceData.totals.total_credits))}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          借方合計
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(trialBalanceData.totals.total_debits)}
                        </div>
                        <p className="text-xs text-blue-600/70 mt-1">
                          {trialBalanceData.entries.filter(e => e.debit_balance > 0).length} 科目
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          貸方合計
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold text-purple-600">
                          {formatCurrency(trialBalanceData.totals.total_credits)}
                        </div>
                        <p className="text-xs text-purple-600/70 mt-1">
                          {trialBalanceData.entries.filter(e => e.credit_balance > 0).length} 科目
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 試算表メイン */}
                  <Card>
                    <CardHeader>
                      <CardTitle>試算表 - {trialBalanceData.period}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left p-3">勘定科目</th>
                              <th className="text-left p-3">種別</th>
                              <th className="text-right p-3">借方残高</th>
                              <th className="text-right p-3">貸方残高</th>
                              <th className="text-right p-3">差引残高</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trialBalanceData.entries.map((entry) => (
                              <tr key={entry.account_id} className="border-b hover:bg-muted/20">
                                <td className="p-3">
                                  <div>
                                    <div className="font-medium">{entry.account_name}</div>
                                    {entry.account_code && (
                                      <div className="text-xs text-muted-foreground">{entry.account_code}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(entry.category_type)} bg-current bg-opacity-10`}>
                                    {getCategoryLabel(entry.category_type)}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {entry.debit_balance > 0 ? formatCurrency(entry.debit_balance) : '-'}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {entry.credit_balance > 0 ? formatCurrency(entry.credit_balance) : '-'}
                                </td>
                                <td className={`p-3 text-right font-mono font-medium ${
                                  entry.net_balance > 0 ? 'text-blue-600' : entry.net_balance < 0 ? 'text-red-600' : ''
                                }`}>
                                  {entry.net_balance !== 0 ? formatCurrency(entry.net_balance) : '-'}
                                </td>
                              </tr>
                            ))}
                            {/* 合計行 */}
                            <tr className="border-t-2 bg-muted/50 font-semibold">
                              <td className="p-3" colSpan={2}>合計</td>
                              <td className="p-3 text-right font-mono">
                                {formatCurrency(trialBalanceData.totals.total_debits)}
                              </td>
                              <td className="p-3 text-right font-mono">
                                {formatCurrency(trialBalanceData.totals.total_credits)}
                              </td>
                              <td className="p-3 text-right font-mono">
                                {formatCurrency(trialBalanceData.totals.total_debits - trialBalanceData.totals.total_credits)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">試算表データがありません</p>
                  <p className="text-sm">選択した期間に確認済みの取引データがありません</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden">
        <Header />
        <main className="p-4 pb-20">
          <div className="text-center text-muted-foreground">
            試算表はデスクトップでご利用ください。
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}