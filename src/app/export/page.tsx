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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Download, 
  FileText, 
  Calendar,
  DollarSign,
  BarChart3,
  FileSpreadsheet,
  CheckCircle,
  TrendingUp,
  Upload,
  Package,
  RefreshCcw
} from 'lucide-react';
import {
  exportTransactionsToCSV,
  exportTransactionsToExcel,
  exportReportToCSV,
  exportReceiptsToCSV,
  exportAllData,
  exportTaxDataToCSV,
  exportMonthlyData,
  generateImportTemplate,
  getExportStats,
  type TransactionData,
  type ExportOptions
} from '@/lib/utils/data-export';

interface ExportData {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'expense' | 'revenue';
  is_business: boolean;
  is_confirmed: boolean;
  account_categories?: {
    name: string;
    code: string;
    category_type: string;
  };
}

interface PeriodSummary {
  totalRevenue: number;
  totalExpenses: number;
  businessRevenue: number;
  businessExpenses: number;
  personalRevenue: number;
  personalExpenses: number;
  confirmedTransactions: number;
  unconfirmedTransactions: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: 1, label: '1月' },
  { value: 2, label: '2月' },
  { value: 3, label: '3月' },
  { value: 4, label: '4月' },
  { value: 5, label: '5月' },
  { value: 6, label: '6月' },
  { value: 7, label: '7月' },
  { value: 8, label: '8月' },
  { value: 9, label: '9月' },
  { value: 10, label: '10月' },
  { value: 11, label: '11月' },
  { value: 12, label: '12月' },
];

export default function ExportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Form state
  const [periodType, setPeriodType] = useState<'year' | 'month' | 'custom'>('year');
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportType, setExportType] = useState<'transactions' | 'reports' | 'receipts' | 'tax' | 'all'>('transactions');
  const [includePersonal, setIncludePersonal] = useState<boolean>(false);
  const [onlyConfirmed, setOnlyConfirmed] = useState<boolean>(true);
  
  // Data state
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchSummary();
    }
  }, [user, periodType, selectedYear, selectedMonth, customStartDate, customEndDate, includePersonal, onlyConfirmed]);

  const getDateRange = () => {
    switch (periodType) {
      case 'year':
        return {
          startDate: `${selectedYear}-01-01`,
          endDate: `${selectedYear}-12-31`
        };
      case 'month':
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        return {
          startDate: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`,
          endDate: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`
        };
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate
        };
      default:
        return { startDate: '', endDate: '' };
    }
  };

  const fetchSummary = async () => {
    if (!user) return;

    const { startDate, endDate } = getDateRange();
    if (!startDate || !endDate) return;

    try {
      let query = supabase
        .from('transactions')
        .select(`
          id,
          amount,
          transaction_type,
          is_business,
          is_confirmed,
          transaction_date,
          account_categories (
            name,
            code,
            category_type
          )
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (!includePersonal) {
        query = query.eq('is_business', true);
      }

      if (onlyConfirmed) {
        query = query.eq('is_confirmed', true);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Calculate summary
      const summary: PeriodSummary = {
        totalRevenue: 0,
        totalExpenses: 0,
        businessRevenue: 0,
        businessExpenses: 0,
        personalRevenue: 0,
        personalExpenses: 0,
        confirmedTransactions: 0,
        unconfirmedTransactions: 0,
      };

      transactions?.forEach(tx => {
        const amount = Number(tx.amount);
        
        if (tx.transaction_type === 'revenue') {
          summary.totalRevenue += amount;
          if (tx.is_business) {
            summary.businessRevenue += amount;
          } else {
            summary.personalRevenue += amount;
          }
        } else {
          summary.totalExpenses += amount;
          if (tx.is_business) {
            summary.businessExpenses += amount;
          } else {
            summary.personalExpenses += amount;
          }
        }

        if (tx.is_confirmed) {
          summary.confirmedTransactions++;
        } else {
          summary.unconfirmedTransactions++;
        }
      });

      setSummary(summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const convertToTransactionData = (data: ExportData[]): TransactionData[] => {
    return data.map(item => ({
      id: item.id,
      date: item.transaction_date,
      type: item.transaction_type === 'expense' ? 'expense' : 'income',
      amount: item.amount,
      description: item.description,
      category: item.account_categories?.code,
      categoryName: item.account_categories?.name,
      isBusiness: item.is_business,
      merchantName: '',
      receiptUrl: '',
      notes: item.is_confirmed ? '確認済み' : '未確認'
    }));
  };

  const handleExportReceipts = async () => {
    if (!user) return;
    
    try {
      setIsGenerating(true);
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      if (!receipts || receipts.length === 0) {
        alert('レシートデータがありません');
        return;
      }
      
      exportReceiptsToCSV(receipts.map(r => ({
        id: r.id,
        date: r.created_at.split('T')[0],
        amount: r.amount || 0,
        description: r.description || '',
        merchantName: r.merchant_name || '',
        category: r.category,
        categoryName: r.category_name,
        isBusiness: r.is_business || false,
        imageUrl: r.image_url,
        ocrText: r.ocr_text,
        confidence: r.ai_confidence
      })));
      
      alert(`${receipts.length}件のレシートデータをエクスポートしました`);
    } catch (error) {
      console.error('Receipt export error:', error);
      alert('レシートエクスポート中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportTaxData = async () => {
    if (!user) return;
    
    try {
      setIsGenerating(true);
      const { startDate, endDate } = getDateRange();
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_business', true)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);
        
      if (error) throw error;
      
      const revenues = transactions?.filter(t => t.transaction_type === 'revenue') || [];
      const expenses = transactions?.filter(t => t.transaction_type === 'expense') || [];
      
      const totalIncome = revenues.reduce((sum, t) => sum + Number(t.amount), 0);
      const businessExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      
      const taxData = {
        year: selectedYear.toString(),
        totalIncome,
        businessExpenses,
        netIncome: totalIncome - businessExpenses,
        deductions: {
          basic: 480000,
          blueForm: 650000,
          socialInsurance: 0,
          other: 0
        },
        taxCalculation: {
          incomeTax: Math.max(0, (totalIncome - businessExpenses - 1130000) * 0.2),
          residenceTax: Math.max(0, (totalIncome - businessExpenses - 1130000) * 0.1),
          businessTax: Math.max(0, (totalIncome - businessExpenses - 2900000) * 0.05),
          totalTax: 0
        },
        expensesByCategory: []
      };
      
      taxData.taxCalculation.totalTax = 
        taxData.taxCalculation.incomeTax + 
        taxData.taxCalculation.residenceTax + 
        taxData.taxCalculation.businessTax;
        
      exportTaxDataToCSV(taxData);
      alert('税務データをエクスポートしました');
    } catch (error) {
      console.error('Tax export error:', error);
      alert('税務データエクスポート中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportAll = async () => {
    if (!user) return;
    
    try {
      setIsGenerating(true);
      
      // Get all data
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);
        
      const { data: receipts } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id);
        
      if (!transactions || transactions.length === 0) {
        alert('エクスポートするデータがありません');
        return;
      }
      
      const transactionData = convertToTransactionData(transactions);
      const reportData = {
        period: `${selectedYear}年`,
        summary: {
          totalIncome: summary?.totalRevenue || 0,
          totalExpenses: summary?.totalExpenses || 0,
          netIncome: (summary?.totalRevenue || 0) - (summary?.totalExpenses || 0),
          transactionCount: transactions.length
        },
        categoryBreakdown: [],
        businessExpenses: summary?.businessExpenses || 0,
        personalExpenses: summary?.personalExpenses || 0
      };
      
      exportAllData({
        transactions: transactionData,
        receipts: receipts || [],
        reportData
      });
      
      alert('全データのエクスポートを開始しました（複数ファイルがダウンロードされます）');
    } catch (error) {
      console.error('Export all error:', error);
      alert('全データエクスポート中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;

    const { startDate, endDate } = getDateRange();
    if (!startDate || !endDate) {
      alert('期間を指定してください');
      return;
    }

    try {
      setIsGenerating(true);

      let query = supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          description,
          amount,
          transaction_type,
          is_business,
          is_confirmed,
          account_categories (
            name,
            code,
            category_type
          )
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: true });

      if (!includePersonal) {
        query = query.eq('is_business', true);
      }

      if (onlyConfirmed) {
        query = query.eq('is_confirmed', true);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        alert('指定した期間にデータがありません');
        return;
      }

      const transactionData = convertToTransactionData(transactions);
      
      if (exportFormat === 'csv') {
        exportTransactionsToCSV(transactionData);
      } else {
        exportTransactionsToExcel(transactionData);
      }

      setLastExportDate(new Date().toISOString());
      alert(`${transactions.length}件のデータをエクスポートしました`);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('エクスポート中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

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
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  税理士データエクスポート
                </h1>
                <p className="text-muted-foreground">
                  確定申告や税理士への資料提供用データをエクスポート
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-3">
                {/* エクスポート設定 */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>エクスポート設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 期間設定 */}
                      <div>
                        <Label className="text-base font-medium mb-3 block">対象期間</Label>
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <Button 
                              variant={periodType === 'year' ? 'default' : 'outline'}
                              onClick={() => setPeriodType('year')}
                            >
                              年単位
                            </Button>
                            <Button 
                              variant={periodType === 'month' ? 'default' : 'outline'}
                              onClick={() => setPeriodType('month')}
                            >
                              月単位
                            </Button>
                            <Button 
                              variant={periodType === 'custom' ? 'default' : 'outline'}
                              onClick={() => setPeriodType('custom')}
                            >
                              カスタム
                            </Button>
                          </div>

                          {periodType === 'year' && (
                            <div className="flex gap-4 items-center">
                              <Label>年度:</Label>
                              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {YEARS.map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                      {year}年
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {periodType === 'month' && (
                            <div className="flex gap-4 items-center">
                              <Label>年:</Label>
                              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {YEARS.map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                      {year}年
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Label>月:</Label>
                              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MONTHS.map(month => (
                                    <SelectItem key={month.value} value={month.value.toString()}>
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {periodType === 'custom' && (
                            <div className="flex gap-4 items-center">
                              <Label>開始日:</Label>
                              <input 
                                type="date" 
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-3 py-2 border rounded-md"
                              />
                              <Label>終了日:</Label>
                              <input 
                                type="date" 
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-3 py-2 border rounded-md"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* フィルター設定 */}
                      <div>
                        <Label className="text-base font-medium mb-3 block">データフィルター</Label>
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={includePersonal}
                              onChange={(e) => setIncludePersonal(e.target.checked)}
                              className="rounded"
                            />
                            <span>個人取引も含める</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={onlyConfirmed}
                              onChange={(e) => setOnlyConfirmed(e.target.checked)}
                              className="rounded"
                            />
                            <span>確認済み取引のみ</span>
                          </label>
                        </div>
                      </div>

                      {/* エクスポート形式 */}
                      <div>
                        <Label className="text-base font-medium mb-3 block">エクスポート形式</Label>
                        <div className="flex gap-4">
                          <Button 
                            variant={exportFormat === 'csv' ? 'default' : 'outline'}
                            onClick={() => setExportFormat('csv')}
                          >
                            CSV
                          </Button>
                          <Button 
                            variant={exportFormat === 'xlsx' ? 'default' : 'outline'}
                            onClick={() => setExportFormat('xlsx')}
                          >
                            Excel
                          </Button>
                        </div>
                      </div>

                      {/* エクスポート種類 */}
                      <div>
                        <Label className="text-base font-medium mb-3 block">エクスポート種類</Label>
                        <div className="space-y-2">
                          <Button 
                            variant={exportType === 'transactions' ? 'default' : 'outline'}
                            onClick={() => setExportType('transactions')}
                            className="w-full justify-start"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            取引データ
                          </Button>
                          <Button 
                            variant={exportType === 'receipts' ? 'default' : 'outline'}
                            onClick={() => setExportType('receipts')}
                            className="w-full justify-start"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            レシートデータ
                          </Button>
                          <Button 
                            variant={exportType === 'tax' ? 'default' : 'outline'}
                            onClick={() => setExportType('tax')}
                            className="w-full justify-start"
                          >
                            <Calculator className="mr-2 h-4 w-4" />
                            税務データ
                          </Button>
                          <Button 
                            variant={exportType === 'all' ? 'default' : 'outline'}
                            onClick={() => setExportType('all')}
                            className="w-full justify-start"
                          >
                            <Package className="mr-2 h-4 w-4" />
                            全データ
                          </Button>
                        </div>
                      </div>

                      {/* エクスポートボタン */}
                      <div className="pt-4 space-y-2">
                        <Button 
                          onClick={() => {
                            if (exportType === 'transactions') handleExport();
                            else if (exportType === 'receipts') handleExportReceipts();
                            else if (exportType === 'tax') handleExportTaxData();
                            else if (exportType === 'all') handleExportAll();
                          }}
                          disabled={isGenerating}
                          size="lg"
                          className="w-full"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              {exportType === 'all' ? '全データを' : 
                               exportFormat === 'csv' ? 'CSVで' : 'Excelで'}ダウンロード
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline"
                          onClick={() => generateImportTemplate('transactions')}
                          className="w-full"
                          size="sm"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          インポートテンプレートをダウンロード
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* サマリー */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>データサマリー</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summary ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">事業収入</span>
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(summary.businessRevenue)}
                            </p>
                          </div>

                          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-red-600 dark:text-red-400">事業支出</span>
                              <DollarSign className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {formatCurrency(summary.businessExpenses)}
                            </p>
                          </div>

                          {includePersonal && (
                            <>
                              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">個人収入</span>
                                  <BarChart3 className="h-4 w-4 text-blue-600" />
                                </div>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  {formatCurrency(summary.personalRevenue)}
                                </p>
                              </div>

                              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400">個人支出</span>
                                  <FileText className="h-4 w-4 text-orange-600" />
                                </div>
                                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                  {formatCurrency(summary.personalExpenses)}
                                </p>
                              </div>
                            </>
                          )}

                          <div className="pt-4 border-t">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">確認済み取引</span>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-lg font-semibold">{summary.confirmedTransactions}件</p>
                            
                            {summary.unconfirmedTransactions > 0 && (
                              <>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-sm text-muted-foreground">未確認取引</span>
                                  <Calendar className="h-4 w-4 text-orange-600" />
                                </div>
                                <p className="text-lg font-semibold text-orange-600">
                                  {summary.unconfirmedTransactions}件
                                </p>
                              </>
                            )}
                          </div>

                          {lastExportDate && (
                            <div className="pt-4 border-t">
                              <p className="text-xs text-muted-foreground">
                                最終エクスポート: {new Date(lastExportDate).toLocaleString('ja-JP')}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">期間を選択してください</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
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
            <h1 className="text-2xl font-bold text-foreground mb-2">データエクスポート</h1>
            <p className="text-sm text-muted-foreground">税理士用データの出力</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">期間設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={periodType === 'year' ? 'default' : 'outline'}
                    onClick={() => setPeriodType('year')}
                    size="sm"
                  >
                    年単位
                  </Button>
                  <Button 
                    variant={periodType === 'month' ? 'default' : 'outline'}
                    onClick={() => setPeriodType('month')}
                    size="sm"
                  >
                    月単位
                  </Button>
                  <Button 
                    variant={periodType === 'custom' ? 'default' : 'outline'}
                    onClick={() => setPeriodType('custom')}
                    size="sm"
                  >
                    カスタム
                  </Button>
                </div>

                {periodType === 'year' && (
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={includePersonal}
                      onChange={(e) => setIncludePersonal(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">個人取引も含める</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={onlyConfirmed}
                      onChange={(e) => setOnlyConfirmed(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">確認済み取引のみ</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">データサマリー</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(summary.businessRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">事業収入</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(summary.businessExpenses)}
                      </p>
                      <p className="text-xs text-muted-foreground">事業支出</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <p className="font-semibold">{summary.confirmedTransactions}件の取引</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={handleExport}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Calculator className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  CSVダウンロード
                </>
              )}
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}