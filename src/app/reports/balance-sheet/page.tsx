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
import { ArrowLeft, Download, Building2, Wallet, TrendingUp, Banknote } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';

// 貸借対照表エントリーのインターフェース
interface BalanceSheetEntry {
  account_id: string;
  account_name: string;
  account_code?: string;
  category_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
}

// 貸借対照表データの構造
interface BalanceSheetData {
  period: string;
  assets: {
    current_assets: BalanceSheetEntry[];
    fixed_assets: BalanceSheetEntry[];
    total_assets: number;
  };
  liabilities: {
    current_liabilities: BalanceSheetEntry[];
    long_term_liabilities: BalanceSheetEntry[];
    total_liabilities: number;
  };
  equity: {
    capital: BalanceSheetEntry[];
    retained_earnings: number;
    total_equity: number;
  };
  balance_check: {
    assets_total: number;
    liabilities_equity_total: number;
    is_balanced: boolean;
  };
}

type ReportPeriod = 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear';

export default function BalanceSheetPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('thisMonth');
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchBalanceSheetData();
    }
  }, [user, selectedPeriod]);

  const getPeriodDates = (period: ReportPeriod) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (period) {
      case 'thisMonth':
        return {
          start: new Date(year, month, 1).toISOString().split('T')[0],
          end: new Date(year, month + 1, 0).toISOString().split('T')[0],
          label: '今月末現在'
        };
      case 'lastMonth':
        return {
          start: new Date(year, month - 1, 1).toISOString().split('T')[0],
          end: new Date(year, month, 0).toISOString().split('T')[0],
          label: '先月末現在'
        };
      case 'thisYear':
        return {
          start: new Date(year, 0, 1).toISOString().split('T')[0],
          end: new Date(year, 11, 31).toISOString().split('T')[0],
          label: '今年末現在'
        };
      case 'lastYear':
        return {
          start: new Date(year - 1, 0, 1).toISOString().split('T')[0],
          end: new Date(year - 1, 11, 31).toISOString().split('T')[0],
          label: '昨年末現在'
        };
    }
  };

  const fetchBalanceSheetData = async () => {
    if (!user) return;

    try {
      setLoadingData(true);
      const { start, end, label } = getPeriodDates(selectedPeriod);

      // 取引データを取得
      const { data: transactions, error } = await supabase
        .from('transaction_summary')
        .select(`
          amount,
          description,
          transaction_date
        `)
        .eq('user_id', user.id)
        .lte('transaction_date', end);

      if (error) throw error;

      // 勘定科目別の残高を計算
      const accountBalances = new Map<string, number>();
      
      transactions?.forEach(tx => {
        const amount = Number(tx.amount);
        const category = tx.description || '未分類';
        
        if (accountBalances.has(category)) {
          accountBalances.set(category, accountBalances.get(category)! + amount);
        } else {
          accountBalances.set(category, amount);
        }
      });

      // 勘定科目を資産・負債・資本に分類
      const assets: BalanceSheetEntry[] = [];
      const liabilities: BalanceSheetEntry[] = [];
      const equity: BalanceSheetEntry[] = [];
      
      // 簡単な分類ロジック（実際のアプリではより詳細な分類が必要）
      accountBalances.forEach((balance, accountName) => {
        const entry: BalanceSheetEntry = {
          account_id: accountName,
          account_name: accountName,
          category_type: determineAccountType(accountName, balance),
          balance: Math.abs(balance)
        };

        if (isAssetAccount(accountName)) {
          assets.push(entry);
        } else if (isLiabilityAccount(accountName)) {
          liabilities.push(entry);
        } else if (isEquityAccount(accountName)) {
          equity.push(entry);
        }
      });

      // 現金及び預金を追加（残高がない場合でも表示）
      if (!assets.find(a => a.account_name === '現金及び預金')) {
        assets.unshift({
          account_id: 'cash',
          account_name: '現金及び預金',
          category_type: 'asset',
          balance: calculateCashBalance(transactions || [])
        });
      }

      // 売掛金を追加
      if (!assets.find(a => a.account_name === '売掛金')) {
        assets.push({
          account_id: 'accounts_receivable',
          account_name: '売掛金',
          category_type: 'asset',
          balance: 0
        });
      }

      // 買掛金を追加
      if (!liabilities.find(l => l.account_name === '買掛金')) {
        liabilities.push({
          account_id: 'accounts_payable',
          account_name: '買掛金',
          category_type: 'liability',
          balance: 0
        });
      }

      // 元入金を追加
      if (!equity.find(e => e.account_name === '元入金')) {
        equity.push({
          account_id: 'capital',
          account_name: '元入金',
          category_type: 'equity',
          balance: 1000000 // デフォルト元入金
        });
      }

      // 流動資産と固定資産に分類
      const currentAssets = assets.filter(a => isCurrentAsset(a.account_name));
      const fixedAssets = assets.filter(a => !isCurrentAsset(a.account_name));

      // 流動負債と固定負債に分類
      const currentLiabilities = liabilities.filter(l => isCurrentLiability(l.account_name));
      const longTermLiabilities = liabilities.filter(l => !isCurrentLiability(l.account_name));

      const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
      const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
      
      // 当期純利益を計算
      const retainedEarnings = calculateRetainedEarnings(transactions || []);
      const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0) + retainedEarnings;

      const balanceSheet: BalanceSheetData = {
        period: label,
        assets: {
          current_assets: currentAssets,
          fixed_assets: fixedAssets,
          total_assets: totalAssets
        },
        liabilities: {
          current_liabilities: currentLiabilities,
          long_term_liabilities: longTermLiabilities,
          total_liabilities: totalLiabilities
        },
        equity: {
          capital: equity,
          retained_earnings: retainedEarnings,
          total_equity: totalEquity
        },
        balance_check: {
          assets_total: totalAssets,
          liabilities_equity_total: totalLiabilities + totalEquity,
          is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
        }
      };

      setBalanceSheetData(balanceSheet);

    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      showToast('error', 'エラー', '貸借対照表データの取得に失敗しました');
    } finally {
      setLoadingData(false);
    }
  };

  // 勘定科目タイプを判定
  const determineAccountType = (accountName: string, balance: number): 'asset' | 'liability' | 'equity' => {
    if (isAssetAccount(accountName)) return 'asset';
    if (isLiabilityAccount(accountName)) return 'liability';
    return 'equity';
  };

  // 資産科目かどうか判定
  const isAssetAccount = (accountName: string): boolean => {
    const assetKeywords = ['現金', '預金', '売掛金', '商品', '備品', '建物', '土地', '車両', '機械'];
    return assetKeywords.some(keyword => accountName.includes(keyword));
  };

  // 負債科目かどうか判定
  const isLiabilityAccount = (accountName: string): boolean => {
    const liabilityKeywords = ['買掛金', '借入', '未払', '預り金', '税金'];
    return liabilityKeywords.some(keyword => accountName.includes(keyword));
  };

  // 資本科目かどうか判定
  const isEquityAccount = (accountName: string): boolean => {
    const equityKeywords = ['資本', '元入', '出資'];
    return equityKeywords.some(keyword => accountName.includes(keyword));
  };

  // 流動資産かどうか判定
  const isCurrentAsset = (accountName: string): boolean => {
    const currentAssetKeywords = ['現金', '預金', '売掛金', '商品', '前払'];
    return currentAssetKeywords.some(keyword => accountName.includes(keyword));
  };

  // 流動負債かどうか判定
  const isCurrentLiability = (accountName: string): boolean => {
    const currentLiabilityKeywords = ['買掛金', '未払', '預り金'];
    return currentLiabilityKeywords.some(keyword => accountName.includes(keyword));
  };

  // 現金残高を計算
  const calculateCashBalance = (transactions: any[]): number => {
    return transactions
      .filter(tx => tx.description === '現金' || tx.description?.includes('預金'))
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  };

  // 当期純利益（繰越利益剰余金）を計算
  const calculateRetainedEarnings = (transactions: any[]): number => {
    const totalRevenue = transactions
      .filter(tx => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    const totalExpenses = Math.abs(transactions
      .filter(tx => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0));

    return totalRevenue - totalExpenses;
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const exportToCSV = () => {
    if (!balanceSheetData) return;

    const csvData = [
      ['貸借対照表', balanceSheetData.period],
      [''],
      ['【資産の部】'],
      ['流動資産'],
      ...balanceSheetData.assets.current_assets.map(asset => 
        [`  ${asset.account_name}`, formatCurrency(asset.balance)]
      ),
      ['固定資産'],
      ...balanceSheetData.assets.fixed_assets.map(asset => 
        [`  ${asset.account_name}`, formatCurrency(asset.balance)]
      ),
      ['資産合計', formatCurrency(balanceSheetData.assets.total_assets)],
      [''],
      ['【負債の部】'],
      ['流動負債'],
      ...balanceSheetData.liabilities.current_liabilities.map(liability => 
        [`  ${liability.account_name}`, formatCurrency(liability.balance)]
      ),
      ['固定負債'],
      ...balanceSheetData.liabilities.long_term_liabilities.map(liability => 
        [`  ${liability.account_name}`, formatCurrency(liability.balance)]
      ),
      ['負債合計', formatCurrency(balanceSheetData.liabilities.total_liabilities)],
      [''],
      ['【純資産の部】'],
      ...balanceSheetData.equity.capital.map(capital => 
        [`  ${capital.account_name}`, formatCurrency(capital.balance)]
      ),
      ['  当期純利益', formatCurrency(balanceSheetData.equity.retained_earnings)],
      ['純資産合計', formatCurrency(balanceSheetData.equity.total_equity)],
      [''],
      ['負債・純資産合計', formatCurrency(balanceSheetData.balance_check.liabilities_equity_total)]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `貸借対照表_${balanceSheetData.period}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('success', 'エクスポート完了', 'CSVファイルをダウンロードしました');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
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
                  <div className="flex items-center gap-4 mb-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/reports">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        レポート一覧
                      </Link>
                    </Button>
                  </div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">貸借対照表</h1>
                  <p className="text-muted-foreground">資産・負債・純資産の財政状態を表示します</p>
                </div>
                <div className="flex gap-4 items-center">
                  <Select value={selectedPeriod} onValueChange={(value: ReportPeriod) => setSelectedPeriod(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thisMonth">今月末現在</SelectItem>
                      <SelectItem value="lastMonth">先月末現在</SelectItem>
                      <SelectItem value="thisYear">今年末現在</SelectItem>
                      <SelectItem value="lastYear">昨年末現在</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={exportToCSV} disabled={!balanceSheetData} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    CSVエクスポート
                  </Button>
                </div>
              </div>

              {loadingData ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">貸借対照表を作成中...</p>
                </div>
              ) : balanceSheetData ? (
                <div className="space-y-8">
                  {/* 貸借バランス確認 */}
                  {!balanceSheetData.balance_check.is_balanced && (
                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
                      <CardContent className="p-4">
                        <p className="text-orange-800 dark:text-orange-200 text-sm">
                          ⚠️ 貸借バランスが取れていません。資産合計と負債・純資産合計が一致しません。
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-8 lg:grid-cols-2">
                    {/* 資産の部 */}
                    <div className="space-y-6">
                      <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900">
                        <CardHeader>
                          <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            資産の部
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* 流動資産 */}
                          <div>
                            <h3 className="text-lg font-semibold text-blue-600 mb-3">流動資産</h3>
                            <div className="space-y-2">
                              {balanceSheetData.assets.current_assets.map((asset) => (
                                <div key={asset.account_id} className="flex justify-between items-center py-2 px-3 bg-white/70 dark:bg-slate-800/50 rounded-lg">
                                  <span className="text-sm">{asset.account_name}</span>
                                  <span className="font-mono text-sm">{formatCurrency(asset.balance)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 固定資産 */}
                          <div>
                            <h3 className="text-lg font-semibold text-blue-600 mb-3">固定資産</h3>
                            <div className="space-y-2">
                              {balanceSheetData.assets.fixed_assets.map((asset) => (
                                <div key={asset.account_id} className="flex justify-between items-center py-2 px-3 bg-white/70 dark:bg-slate-800/50 rounded-lg">
                                  <span className="text-sm">{asset.account_name}</span>
                                  <span className="font-mono text-sm">{formatCurrency(asset.balance)}</span>
                                </div>
                              ))}
                              {balanceSheetData.assets.fixed_assets.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                  固定資産はありません
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 資産合計 */}
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold">
                              <span>資産合計</span>
                              <span className="font-mono">{formatCurrency(balanceSheetData.assets.total_assets)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 負債・純資産の部 */}
                    <div className="space-y-6">
                      {/* 負債の部 */}
                      <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-950 dark:to-pink-900">
                        <CardHeader>
                          <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                            <Banknote className="h-5 w-5" />
                            負債の部
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* 流動負債 */}
                          <div>
                            <h3 className="text-lg font-semibold text-red-600 mb-3">流動負債</h3>
                            <div className="space-y-2">
                              {balanceSheetData.liabilities.current_liabilities.map((liability) => (
                                <div key={liability.account_id} className="flex justify-between items-center py-2 px-3 bg-white/70 dark:bg-slate-800/50 rounded-lg">
                                  <span className="text-sm">{liability.account_name}</span>
                                  <span className="font-mono text-sm">{formatCurrency(liability.balance)}</span>
                                </div>
                              ))}
                              {balanceSheetData.liabilities.current_liabilities.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                  流動負債はありません
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 固定負債 */}
                          <div>
                            <h3 className="text-lg font-semibold text-red-600 mb-3">固定負債</h3>
                            <div className="space-y-2">
                              {balanceSheetData.liabilities.long_term_liabilities.map((liability) => (
                                <div key={liability.account_id} className="flex justify-between items-center py-2 px-3 bg-white/70 dark:bg-slate-800/50 rounded-lg">
                                  <span className="text-sm">{liability.account_name}</span>
                                  <span className="font-mono text-sm">{formatCurrency(liability.balance)}</span>
                                </div>
                              ))}
                              {balanceSheetData.liabilities.long_term_liabilities.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                  固定負債はありません
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 負債合計 */}
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center py-3 px-4 bg-red-600 text-white rounded-lg font-semibold">
                              <span>負債合計</span>
                              <span className="font-mono">{formatCurrency(balanceSheetData.liabilities.total_liabilities)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 純資産の部 */}
                      <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900">
                        <CardHeader>
                          <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            純資産の部
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            {balanceSheetData.equity.capital.map((capital) => (
                              <div key={capital.account_id} className="flex justify-between items-center py-2 px-3 bg-white/70 dark:bg-slate-800/50 rounded-lg">
                                <span className="text-sm">{capital.account_name}</span>
                                <span className="font-mono text-sm">{formatCurrency(capital.balance)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center py-2 px-3 bg-white/70 dark:bg-slate-800/50 rounded-lg">
                              <span className="text-sm">当期純利益</span>
                              <span className={`font-mono text-sm ${balanceSheetData.equity.retained_earnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(balanceSheetData.equity.retained_earnings)}
                              </span>
                            </div>
                          </div>

                          {/* 純資産合計 */}
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center py-3 px-4 bg-green-600 text-white rounded-lg font-semibold">
                              <span>純資産合計</span>
                              <span className="font-mono">{formatCurrency(balanceSheetData.equity.total_equity)}</span>
                            </div>
                          </div>

                          {/* 負債・純資産合計 */}
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center py-3 px-4 bg-slate-700 text-white rounded-lg font-bold text-lg">
                              <span>負債・純資産合計</span>
                              <span className="font-mono">{formatCurrency(balanceSheetData.balance_check.liabilities_equity_total)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">データがありません</p>
                  <p className="text-sm">選択した期間に取引データがありません</p>
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
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">デスクトップでご利用ください</p>
            <p className="text-sm">貸借対照表は複雑な表示のため、デスクトップ画面でのご利用を推奨します。</p>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}