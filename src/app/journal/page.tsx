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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Calculator, 
  FileText, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Building2,
  User,
  Filter,
  Download
} from 'lucide-react';

interface JournalEntry {
  id: string;
  transaction_id: string;
  transaction_date: string;
  description: string;
  debit_account: string;
  debit_account_name: string;
  credit_account: string;
  credit_account_name: string;
  amount: number;
  is_business: boolean;
  reference_number?: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  transaction_type: 'expense' | 'revenue';
  is_business: boolean;
  is_confirmed: boolean;
  category_id?: string;
  account_categories?: {
    name: string;
    code: string;
    category_type: string;
  };
}

const ACCOUNT_MAPPING = {
  // 収入の仕訳
  revenue: {
    business: { debit: '1001', debit_name: '普通預金', credit: '4001', credit_name: '売上高' },
    personal: { debit: '1001', debit_name: '普通預金', credit: '4002', credit_name: '雑収入' }
  },
  // 支出の仕訳
  expense: {
    business: { debit: '5001', debit_name: '事業費', credit: '1001', credit_name: '普通預金' },
    personal: { debit: '6001', debit_name: '個人支出', credit: '1001', credit_name: '普通預金' }
  }
};

export default function JournalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchJournalEntries();
    }
  }, [user, selectedYear, selectedMonth, filterType]);

  const generateJournalEntry = (transaction: Transaction): JournalEntry => {
    const accountInfo = ACCOUNT_MAPPING[transaction.transaction_type][transaction.is_business ? 'business' : 'personal'];
    
    return {
      id: `journal_${transaction.id}`,
      transaction_id: transaction.id,
      transaction_date: transaction.transaction_date,
      description: transaction.description,
      debit_account: accountInfo.debit,
      debit_account_name: accountInfo.debit_name,
      credit_account: accountInfo.credit,
      credit_account_name: accountInfo.credit_name,
      amount: transaction.amount,
      is_business: transaction.is_business,
      reference_number: `TR${transaction.id.slice(-6).toUpperCase()}`
    };
  };

  const fetchJournalEntries = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('transactions')
        .select(`
          id,
          amount,
          description,
          transaction_date,
          transaction_type,
          is_business,
          is_confirmed,
          category_id,
          account_categories (
            name,
            code,
            category_type
          )
        `)
        .eq('user_id', user.id)
        .eq('is_confirmed', true)
        .order('transaction_date', { ascending: false });

      // 年度フィルター
      if (selectedYear !== 'all') {
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
      }

      // 月フィルター
      if (selectedMonth !== 'all') {
        const year = selectedYear === 'all' ? new Date().getFullYear() : parseInt(selectedYear);
        const month = selectedMonth.padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;
        query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
      }

      // タイプフィルター
      if (filterType !== 'all') {
        if (filterType === 'business') {
          query = query.eq('is_business', true);
        } else if (filterType === 'personal') {
          query = query.eq('is_business', false);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const entries = (data || []).map(generateJournalEntry);
      setJournalEntries(entries);
      
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportJournal = () => {
    if (journalEntries.length === 0) return;

    const csvContent = [
      // ヘッダー
      '日付,摘要,借方勘定,貸方勘定,金額,事業区分,参照番号',
      // データ
      ...journalEntries.map(entry => 
        `${new Date(entry.transaction_date).toLocaleDateString('ja-JP')},${entry.description},${entry.debit_account_name},${entry.credit_account_name},${entry.amount},${entry.is_business ? '事業' : '個人'},${entry.reference_number}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const periodLabel = selectedMonth === 'all' 
      ? `${selectedYear}年` 
      : `${selectedYear}年${selectedMonth}月`;
    
    link.download = `仕訳帳_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getTotalDebitAmount = () => journalEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const getTotalCreditAmount = () => journalEntries.reduce((sum, entry) => sum + entry.amount, 0);

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
                <h1 className="text-3xl font-bold text-foreground mb-2">仕訳帳</h1>
                <p className="text-muted-foreground">複式簿記の仕訳データを確認・管理できます</p>
              </div>

              {/* フィルターコントロール */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium">対象年度</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          <SelectItem value="2025">2025年</SelectItem>
                          <SelectItem value="2024">2024年</SelectItem>
                          <SelectItem value="2023">2023年</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">月</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1}月
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">区分</Label>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          <SelectItem value="business">事業</SelectItem>
                          <SelectItem value="personal">個人</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        onClick={exportJournal}
                        disabled={journalEntries.length === 0}
                        className="w-full"
                        variant="outline"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        CSV出力
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 合計表示 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">仕訳件数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{journalEntries.length}</div>
                    <p className="text-xs text-muted-foreground">総仕訳エントリ数</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">借方合計</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(getTotalDebitAmount())}</div>
                    <p className="text-xs text-muted-foreground">期間内の借方総額</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">貸方合計</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalCreditAmount())}</div>
                    <p className="text-xs text-muted-foreground">期間内の貸方総額</p>
                  </CardContent>
                </Card>
              </div>

              {/* 仕訳帳テーブル */}
              <Card>
                <CardHeader>
                  <CardTitle>仕訳帳</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-12">
                      <Calculator className="h-12 w-12 mx-auto mb-4 animate-spin" />
                      <p className="text-muted-foreground">読み込み中...</p>
                    </div>
                  ) : journalEntries.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">仕訳データがありません</p>
                      <p className="text-sm">確認済みの取引から自動で仕訳が生成されます</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* テーブルヘッダー */}
                      <div className="grid grid-cols-8 gap-4 p-3 bg-muted/30 rounded-lg font-medium text-sm">
                        <div>日付</div>
                        <div>摘要</div>
                        <div>借方勘定</div>
                        <div>貸方勘定</div>
                        <div className="text-right">金額</div>
                        <div>区分</div>
                        <div>参照番号</div>
                        <div></div>
                      </div>
                      
                      {/* 仕訳エントリ */}
                      {journalEntries.map((entry) => (
                        <div key={entry.id} className="grid grid-cols-8 gap-4 p-3 border rounded-lg hover:bg-muted/20">
                          <div className="text-sm">
                            {formatDate(entry.transaction_date)}
                          </div>
                          <div className="text-sm font-medium">
                            {entry.description}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">{entry.debit_account_name}</div>
                            <div className="text-xs text-muted-foreground">{entry.debit_account}</div>
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">{entry.credit_account_name}</div>
                            <div className="text-xs text-muted-foreground">{entry.credit_account}</div>
                          </div>
                          <div className="text-sm font-semibold text-right">
                            {formatCurrency(entry.amount)}
                          </div>
                          <div>
                            <Badge variant={entry.is_business ? 'default' : 'secondary'}>
                              {entry.is_business ? '事業' : '個人'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.reference_number}
                          </div>
                          <div className="flex items-center">
                            {entry.is_business ? (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">仕訳帳</h1>
          </div>

          {/* モバイル用フィルター */}
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs">年度</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">月</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1}月
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="business">事業</SelectItem>
                    <SelectItem value="personal">個人</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={exportJournal}
                  disabled={journalEntries.length === 0}
                  size="sm"
                  variant="outline"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* モバイル用統計 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold">{journalEntries.length}</div>
                <div className="text-xs text-muted-foreground">仕訳数</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-green-600">
                  {getTotalDebitAmount() >= 1000000 
                    ? `¥${(getTotalDebitAmount() / 1000000).toFixed(1)}M`
                    : getTotalDebitAmount() >= 10000 
                    ? `¥${Math.round(getTotalDebitAmount() / 1000)}K`
                    : formatCurrency(getTotalDebitAmount())
                  }
                </div>
                <div className="text-xs text-muted-foreground">借方</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-blue-600">
                  {getTotalCreditAmount() >= 1000000 
                    ? `¥${(getTotalCreditAmount() / 1000000).toFixed(1)}M`
                    : getTotalCreditAmount() >= 10000 
                    ? `¥${Math.round(getTotalCreditAmount() / 1000)}K`
                    : formatCurrency(getTotalCreditAmount())
                  }
                </div>
                <div className="text-xs text-muted-foreground">貸方</div>
              </CardContent>
            </Card>
          </div>

          {/* モバイル用仕訳リスト */}
          {journalEntries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">仕訳データがありません</p>
                <p className="text-xs text-muted-foreground">確認済み取引から生成</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {journalEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{entry.description}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(entry.transaction_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(entry.amount)}</div>
                        <Badge variant={entry.is_business ? 'default' : 'secondary'} className="text-xs">
                          {entry.is_business ? '事業' : '個人'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-green-50 p-2 rounded">
                        <div className="text-green-800 font-medium">借方</div>
                        <div className="text-green-700">{entry.debit_account_name}</div>
                        <div className="text-green-600 text-xs">{entry.debit_account}</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-blue-800 font-medium">貸方</div>
                        <div className="text-blue-700">{entry.credit_account_name}</div>
                        <div className="text-blue-600 text-xs">{entry.credit_account}</div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground text-center">
                      {entry.reference_number}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}