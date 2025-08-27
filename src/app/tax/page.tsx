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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Lightbulb, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { 
  calculateTax, 
  getTaxSavingTips, 
  getTaxCalendar, 
  calculateMonthlyTaxEstimate,
  type TaxCalculationInput, 
  type TaxCalculationResult 
} from '@/lib/utils/tax-calculator';

export default function TaxPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // 税務計算の入力値
  const [taxInput, setTaxInput] = useState<TaxCalculationInput>({
    totalRevenue: 0,
    businessExpenses: 0,
    basicDeduction: 480000,
    blueFormDeduction: 650000,
    socialInsurance: 0,
    lifeInsurance: 0,
    earthquakeInsurance: 0,
    medicalExpenses: 0,
    isBlueForm: true
  });
  
  const [taxResult, setTaxResult] = useState<TaxCalculationResult | null>(null);
  const [currentYearData, setCurrentYearData] = useState<{revenue: number, expenses: number}>({revenue: 0, expenses: 0});
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchCurrentYearData();
    }
  }, [user]);

  const fetchCurrentYearData = async () => {
    if (!user) return;

    try {
      setLoadingData(true);
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, transaction_type, is_business')
        .eq('user_id', user.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (error) throw error;

      const revenues = transactions?.filter(t => t.transaction_type === 'revenue') || [];
      const expenses = transactions?.filter(t => t.transaction_type === 'expense' && t.is_business) || [];

      const totalRevenue = revenues.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

      setCurrentYearData({ revenue: totalRevenue, expenses: totalExpenses });
      
      // 自動で入力値を更新
      setTaxInput(prev => ({
        ...prev,
        totalRevenue,
        businessExpenses: totalExpenses
      }));

    } catch (error) {
      console.error('Error fetching current year data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (field: keyof TaxCalculationInput, value: number | boolean) => {
    setTaxInput(prev => ({ ...prev, [field]: value }));
  };

  const calculateTaxes = () => {
    const result = calculateTax(taxInput);
    setTaxResult(result);
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const savingTips = taxResult ? getTaxSavingTips(taxResult, taxInput) : [];
  const taxCalendar = getTaxCalendar();
  const monthlyTaxEstimate = calculateMonthlyTaxEstimate(
    taxInput.totalRevenue / 12, 
    taxInput.businessExpenses / 12
  );

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
                  <h1 className="text-3xl font-bold text-foreground mb-2">税務計算</h1>
                  <p className="text-muted-foreground">所得税・住民税・事業税の概算計算と節税対策</p>
                </div>
              </div>

              {loadingData ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">現在の収支データを取得中...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* 現在の収支状況 */}
                  <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900">
                    <CardHeader>
                      <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        📊 現在の収支状況（今年）
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(currentYearData.revenue)}
                          </div>
                          <p className="text-sm text-blue-600/70">総収入</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(currentYearData.expenses)}
                          </div>
                          <p className="text-sm text-red-600/70">事業経費</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(currentYearData.revenue - currentYearData.expenses)}
                          </div>
                          <p className="text-sm text-green-600/70">所得（概算）</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 入力フォーム */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        税務計算設定
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <h3 className="font-semibold">収入・経費</h3>
                          
                          <div>
                            <Label htmlFor="totalRevenue">総収入（年額）</Label>
                            <Input
                              id="totalRevenue"
                              type="number"
                              value={taxInput.totalRevenue}
                              onChange={(e) => handleInputChange('totalRevenue', Number(e.target.value))}
                              placeholder="5000000"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="businessExpenses">必要経費（年額）</Label>
                            <Input
                              id="businessExpenses"
                              type="number"
                              value={taxInput.businessExpenses}
                              onChange={(e) => handleInputChange('businessExpenses', Number(e.target.value))}
                              placeholder="1500000"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="isBlueForm"
                              checked={taxInput.isBlueForm}
                              onCheckedChange={(checked) => handleInputChange('isBlueForm', checked)}
                            />
                            <Label htmlFor="isBlueForm">青色申告</Label>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-semibold">各種控除</h3>
                          
                          <div>
                            <Label htmlFor="socialInsurance">社会保険料控除</Label>
                            <Input
                              id="socialInsurance"
                              type="number"
                              value={taxInput.socialInsurance || 0}
                              onChange={(e) => handleInputChange('socialInsurance', Number(e.target.value))}
                              placeholder="500000"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="lifeInsurance">生命保険料控除</Label>
                            <Input
                              id="lifeInsurance"
                              type="number"
                              value={taxInput.lifeInsurance || 0}
                              onChange={(e) => handleInputChange('lifeInsurance', Number(e.target.value))}
                              placeholder="120000"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="medicalExpenses">医療費控除</Label>
                            <Input
                              id="medicalExpenses"
                              type="number"
                              value={taxInput.medicalExpenses || 0}
                              onChange={(e) => handleInputChange('medicalExpenses', Number(e.target.value))}
                              placeholder="200000"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Button onClick={calculateTaxes} className="mt-6 w-full" size="lg">
                        <Calculator className="mr-2 h-4 w-4" />
                        税額を計算する
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 計算結果 */}
                  {taxResult && (
                    <>
                      {/* 税額サマリー */}
                      <div className="grid gap-6 md:grid-cols-4">
                        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-green-700 dark:text-green-300">所得税</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(taxResult.incomeTax)}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-blue-700 dark:text-blue-300">住民税</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                              {formatCurrency(taxResult.residenceTax)}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-purple-700 dark:text-purple-300">事業税</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                              {formatCurrency(taxResult.businessTax)}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-red-700 dark:text-red-300">総税額</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                              {formatCurrency(taxResult.totalTax)}
                            </div>
                            <p className="text-xs text-red-600/70 mt-1">
                              月額: {formatCurrency(monthlyTaxEstimate)}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* 詳細内訳 */}
                      <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">所得・控除内訳</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span>総所得金額</span>
                                <span className="font-semibold">{formatCurrency(taxResult.totalIncome)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>基礎控除</span>
                                <span>{formatCurrency(taxResult.breakdown.deductions.basic)}</span>
                              </div>
                              {taxResult.breakdown.deductions.blueForm > 0 && (
                                <div className="flex justify-between">
                                  <span>青色申告特別控除</span>
                                  <span>{formatCurrency(taxResult.breakdown.deductions.blueForm)}</span>
                                </div>
                              )}
                              {taxResult.breakdown.deductions.socialInsurance > 0 && (
                                <div className="flex justify-between">
                                  <span>社会保険料控除</span>
                                  <span>{formatCurrency(taxResult.breakdown.deductions.socialInsurance)}</span>
                                </div>
                              )}
                              <hr />
                              <div className="flex justify-between font-semibold">
                                <span>課税所得金額</span>
                                <span>{formatCurrency(taxResult.taxableIncome)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-green-600">
                                <span>手取り収入（概算）</span>
                                <span>{formatCurrency(taxResult.netIncome)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">所得税詳細</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {taxResult.breakdown.taxDetails.incomeTaxBreakdown.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span>{item.bracket}</span>
                                  <span>{formatCurrency(item.tax)}</span>
                                </div>
                              ))}
                              <hr />
                              <div className="flex justify-between">
                                <span>実効税率</span>
                                <span className="font-semibold">
                                  {taxResult.breakdown.taxDetails.effectiveTaxRate.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* 節税対策の提案 */}
                      {savingTips.length > 0 && (
                        <Card className="border-0 bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-950 dark:to-orange-900">
                          <CardHeader>
                            <CardTitle className="text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                              <Lightbulb className="h-5 w-5" />
                              節税対策のご提案
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {savingTips.map((tip, index) => (
                                <div key={index} className="p-4 rounded-lg bg-white dark:bg-slate-800/50">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                                        {tip.title}
                                      </h4>
                                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        {tip.description}
                                      </p>
                                      <span className="text-xs text-slate-500 dark:text-slate-500 mt-2 inline-block">
                                        {tip.category}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-green-600">
                                        {formatCurrency(tip.potentialSaving)}
                                      </div>
                                      <div className="text-xs text-slate-500">節税効果</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}

                  {/* 税務カレンダー */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        税務スケジュール
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-2">
                        {taxCalendar.slice(0, 6).map((deadline, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <div>
                              <div className="font-semibold text-sm">{deadline.title}</div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {deadline.description}
                              </div>
                            </div>
                            <div className="text-sm font-mono text-slate-500">
                              {new Date(deadline.date).toLocaleDateString('ja-JP', {
                                month: 'numeric',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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
          <h1 className="text-2xl font-bold text-foreground mb-6">税務計算</h1>
          
          {/* モバイル用の簡略版 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">現在の収支</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(currentYearData.revenue)}
                    </div>
                    <p className="text-sm text-muted-foreground">収入</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(currentYearData.expenses)}
                    </div>
                    <p className="text-sm text-muted-foreground">経費</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {taxResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">予想税額</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(taxResult.totalTax)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      月額: {formatCurrency(monthlyTaxEstimate)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}