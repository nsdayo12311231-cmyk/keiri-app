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
import { Calculator, FileText, Download, TrendingUp, TrendingDown, Minus, FileDown } from 'lucide-react';
import { exportReportToPDF, exportCategoryDetailToPDF } from '@/lib/utils/pdf-export';

interface ReportData {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  businessExpenses: number;
  personalExpenses: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  aiClassificationStats: {
    totalClassified: number;
    businessRatio: number;
    topCategories: string[];
  };
}

type ReportPeriod = 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear';

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('thisMonth');
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchReportData();
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
          label: '今月'
        };
      case 'lastMonth':
        return {
          start: new Date(year, month - 1, 1).toISOString().split('T')[0],
          end: new Date(year, month, 0).toISOString().split('T')[0],
          label: '先月'
        };
      case 'thisYear':
        return {
          start: new Date(year, 0, 1).toISOString().split('T')[0],
          end: new Date(year, 11, 31).toISOString().split('T')[0],
          label: '今年'
        };
      case 'lastYear':
        return {
          start: new Date(year - 1, 0, 1).toISOString().split('T')[0],
          end: new Date(year - 1, 11, 31).toISOString().split('T')[0],
          label: '昨年'
        };
    }
  };

  const fetchReportData = async () => {
    if (!user) return;

    try {
      setLoadingReport(true);
      const { start, end, label } = getPeriodDates(selectedPeriod);

      // 現在のデータベース構造に合わせて修正
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          amount,
          transaction_type,
          is_business,
          category,
          category_name,
          description
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      console.log('Transactions for report:', transactions);

      if (error) throw error;

      const expenses = transactions?.filter(t => t.transaction_type === 'expense') || [];
      const revenues = transactions?.filter(t => t.transaction_type === 'revenue') || [];

      const totalRevenue = revenues.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      const businessExpenses = expenses.filter(t => t.is_business).reduce((sum, t) => sum + Number(t.amount), 0);
      const personalExpenses = expenses.filter(t => !t.is_business).reduce((sum, t) => sum + Number(t.amount), 0);

      // カテゴリ別内訳（AI分類結果を活用）
      const categoryMap = new Map();
      expenses.forEach(tx => {
        // AI分類結果を優先、なければフォールバック
        const categoryName = tx.category_name || tx.category || '未分類';
        if (categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, categoryMap.get(categoryName) + Number(tx.amount));
        } else {
          categoryMap.set(categoryName, Number(tx.amount));
        }
      });
      
      console.log('Category breakdown:', Array.from(categoryMap.entries()));

      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // AI分類結果の統計情報
      const classifiedTransactions = transactions?.filter(t => t.category_name) || [];
      const businessTransactions = transactions?.filter(t => t.is_business) || [];
      const topCategories = categoryBreakdown.slice(0, 3).map(item => item.category);

      setReportData({
        period: label,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        transactionCount: transactions?.length || 0,
        businessExpenses,
        personalExpenses,
        categoryBreakdown,
        aiClassificationStats: {
          totalClassified: classifiedTransactions.length,
          businessRatio: transactions && transactions.length > 0 ? 
            (businessTransactions.length / transactions.length) * 100 : 0,
          topCategories
        }
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoadingReport(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `¥${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `¥${(amount / 1000).toFixed(0)}K`;
    }
    return `¥${amount.toLocaleString()}`;
  };

  const formatCurrencyFull = (amount: number) => `¥${amount.toLocaleString()}`;

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ['項目', '金額'],
      ['期間', reportData.period],
      ['総収入', reportData.totalRevenue.toString()],
      ['総支出', reportData.totalExpenses.toString()],
      ['純利益', reportData.netIncome.toString()],
      ['取引件数', reportData.transactionCount.toString()],
      ['事業支出', reportData.businessExpenses.toString()],
      ['個人支出', reportData.personalExpenses.toString()],
      [],
      ['カテゴリ別内訳', ''],
      ...reportData.categoryBreakdown.map(item => [item.category, item.amount.toString()])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `財務レポート_${reportData.period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!reportData) return;
    exportReportToPDF(reportData);
  };

  const exportCategoryPDF = () => {
    if (!reportData) return;
    exportCategoryDetailToPDF(
      reportData.categoryBreakdown,
      reportData.period,
      reportData.totalExpenses
    );
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
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">財務レポート</h1>
                  <p className="text-muted-foreground">収支分析と財務状況をレポートします</p>
                </div>
                <div className="flex gap-4 items-center">
                  <Select value={selectedPeriod} onValueChange={(value: ReportPeriod) => setSelectedPeriod(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thisMonth">今月</SelectItem>
                      <SelectItem value="lastMonth">先月</SelectItem>
                      <SelectItem value="thisYear">今年</SelectItem>
                      <SelectItem value="lastYear">昨年</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={exportReport} disabled={!reportData} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                    <Button onClick={exportToPDF} disabled={!reportData} variant="outline" size="sm">
                      <FileDown className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>

              {loadingReport ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">レポートを作成中...</p>
                </div>
              ) : reportData ? (
                <div className="space-y-8">
                  {/* サマリーカード */}
                  <div className="grid gap-6 md:grid-cols-4">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">総収入</CardTitle>
                        <div className="rounded-full bg-green-600/10 p-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600 truncate" title={formatCurrencyFull(reportData.totalRevenue)}>
                          {formatCurrency(reportData.totalRevenue)}
                        </div>
                        <p className="text-xs text-green-600/70 mt-1">
                          {formatCurrencyFull(reportData.totalRevenue)}
                        </p>
                      </CardContent>
                      <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full -translate-y-10 translate-x-10"></div>
                    </Card>

                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">総支出</CardTitle>
                        <div className="rounded-full bg-red-600/10 p-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600 truncate" title={formatCurrencyFull(reportData.totalExpenses)}>
                          {formatCurrency(reportData.totalExpenses)}
                        </div>
                        <p className="text-xs text-red-600/70 mt-1">
                          {formatCurrencyFull(reportData.totalExpenses)}
                        </p>
                      </CardContent>
                      <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -translate-y-10 translate-x-10"></div>
                    </Card>

                    <Card className={`relative overflow-hidden border-0 ${
                      reportData.netIncome >= 0 
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900' 
                        : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900'
                    }`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${
                          reportData.netIncome >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'
                        }`}>純利益</CardTitle>
                        <div className={`rounded-full p-2 ${
                          reportData.netIncome >= 0 ? 'bg-blue-600/10' : 'bg-orange-600/10'
                        }`}>
                          <Minus className={`h-4 w-4 ${
                            reportData.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                          }`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold truncate ${
                          reportData.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                        }`} title={formatCurrencyFull(reportData.netIncome)}>
                          {formatCurrency(reportData.netIncome)}
                        </div>
                        <p className={`text-xs mt-1 ${
                          reportData.netIncome >= 0 ? 'text-blue-600/70' : 'text-orange-600/70'
                        }`}>
                          {formatCurrencyFull(reportData.netIncome)}
                        </p>
                      </CardContent>
                      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-10 translate-x-10 ${
                        reportData.netIncome >= 0 ? 'bg-blue-500/5' : 'bg-orange-500/5'
                      }`}></div>
                    </Card>

                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">取引件数</CardTitle>
                        <div className="rounded-full bg-purple-600/10 p-2">
                          <FileText className="h-4 w-4 text-purple-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{reportData.transactionCount}</div>
                        <p className="text-xs text-purple-600/70 mt-1">件</p>
                      </CardContent>
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -translate-y-10 translate-x-10"></div>
                    </Card>
                  </div>

                  {/* 事業用・個人用内訳 */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 dark:from-blue-950 dark:via-blue-900 dark:to-indigo-900">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                          事業用支出
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold mb-2 text-blue-600 truncate" title={formatCurrencyFull(reportData.businessExpenses)}>
                          {formatCurrency(reportData.businessExpenses)}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-blue-600/80">
                            総支出の {reportData.totalExpenses > 0 ? ((reportData.businessExpenses / reportData.totalExpenses) * 100).toFixed(1) : 0}%
                          </p>
                          <div className="text-xs text-blue-600/60">
                            {formatCurrencyFull(reportData.businessExpenses)}
                          </div>
                        </div>
                        <div className="mt-3 bg-blue-600/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                            style={{
                              width: `${reportData.totalExpenses > 0 ? (reportData.businessExpenses / reportData.totalExpenses) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                      </CardContent>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-12 translate-x-12"></div>
                    </Card>

                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-green-100 dark:from-emerald-950 dark:via-emerald-900 dark:to-green-900">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                          個人用支出
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold mb-2 text-emerald-600 truncate" title={formatCurrencyFull(reportData.personalExpenses)}>
                          {formatCurrency(reportData.personalExpenses)}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-emerald-600/80">
                            総支出の {reportData.totalExpenses > 0 ? ((reportData.personalExpenses / reportData.totalExpenses) * 100).toFixed(1) : 0}%
                          </p>
                          <div className="text-xs text-emerald-600/60">
                            {formatCurrencyFull(reportData.personalExpenses)}
                          </div>
                        </div>
                        <div className="mt-3 bg-emerald-600/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                            style={{
                              width: `${reportData.totalExpenses > 0 ? (reportData.personalExpenses / reportData.totalExpenses) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                      </CardContent>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-12 translate-x-12"></div>
                    </Card>
                  </div>

                  {/* AI分類結果統計 */}
                  <Card className="border-0 bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950 dark:to-purple-900">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        🤖 AI分類結果統計
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-indigo-600">
                            {reportData.aiClassificationStats.totalClassified}
                          </div>
                          <p className="text-sm text-indigo-600/70">AI分類件数</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {reportData.aiClassificationStats.businessRatio.toFixed(1)}%
                          </div>
                          <p className="text-sm text-purple-600/70">事業用比率</p>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                            主要カテゴリ
                          </div>
                          <div className="text-xs space-y-1">
                            {reportData.aiClassificationStats.topCategories.map((cat, i) => (
                              <div key={i} className="text-indigo-600/80">
                                {i + 1}. {cat}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* カテゴリ別内訳 */}
                  <Card className="border-0 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
                    <CardHeader className="pb-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-600 rounded-lg flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          支出カテゴリ別内訳
                        </CardTitle>
                        <Button 
                          onClick={exportCategoryPDF} 
                          disabled={!reportData} 
                          variant="outline" 
                          size="sm"
                          className="text-xs"
                        >
                          <FileDown className="mr-1 h-3 w-3" />
                          詳細PDF
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {reportData.categoryBreakdown.map((item, index) => {
                          const colors = [
                            'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 
                            'bg-red-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500',
                            'bg-green-500', 'bg-cyan-500'
                          ];
                          const color = colors[index % colors.length];
                          
                          return (
                            <div key={item.category} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                                  {index + 1}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{item.category}</span>
                                  <div className="mt-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 w-32">
                                    <div 
                                      className={`h-full ${color} rounded-full transition-all duration-500`}
                                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-slate-700 dark:text-slate-300 truncate" title={formatCurrencyFull(item.amount)}>
                                  {formatCurrency(item.amount)}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                  {item.percentage.toFixed(1)}%
                                </div>
                                <div className="text-xs text-slate-400 dark:text-slate-500">
                                  {formatCurrencyFull(item.amount)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">レポートデータがありません</p>
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">財務レポート</h1>
            <Select value={selectedPeriod} onValueChange={(value: ReportPeriod) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisMonth">今月</SelectItem>
                <SelectItem value="lastMonth">先月</SelectItem>
                <SelectItem value="thisYear">今年</SelectItem>
                <SelectItem value="lastYear">昨年</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportData && (
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">収入</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(reportData.totalRevenue)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">支出</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(reportData.totalExpenses)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">純利益</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(reportData.netIncome)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}