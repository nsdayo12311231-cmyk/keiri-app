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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calculator, 
  FileText, 
  Download, 
  ArrowLeft, 
  BookOpen,
  Search,
  Filter,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';

interface LedgerTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  is_business: boolean;
  running_balance: number;
  debit_amount?: number;
  credit_amount?: number;
}

interface LedgerAccount {
  account_id: string;
  account_name: string;
  account_code?: string;
  category_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  opening_balance: number;
  closing_balance: number;
  transactions: LedgerTransaction[];
  total_debits: number;
  total_credits: number;
}

export default function GeneralLedgerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ledgerData, setLedgerData] = useState<LedgerAccount[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [accountCategories, setAccountCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchAccountCategories();
      fetchLedgerData();
    }
  }, [user, selectedPeriod, selectedAccount]);

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

  const fetchAccountCategories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('account_categories')
        .select('id, name, code, category_type')
        .order('category_type')
        .order('name');

      if (error) throw error;
      setAccountCategories(data || []);
    } catch (error) {
      console.error('勘定科目取得エラー:', error);
    }
  };

  const fetchLedgerData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { start, end } = getPeriodDates(selectedPeriod);

      // 期間内の取引データを取得
      let query = supabase
        .from('transactions')
        .select(`
          id,
          amount,
          description,
          transaction_date,
          is_business,
          category_id,
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
        .lte('transaction_date', end)
        .order('transaction_date', { ascending: true });

      if (selectedAccount !== 'all') {
        query = query.eq('category_id', selectedAccount);
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

      console.log('General Ledger transactions:', transactions);

      // 勘定科目別にグループ化
      const accountMap = new Map<string, {
        account: any;
        transactions: LedgerTransaction[];
        total_debits: number;
        total_credits: number;
      }>();

      // 使用されている勘定科目を初期化
      transactions?.forEach(transaction => {
        const categoryId = transaction.category_id;
        const account = transaction.account_categories;
        
        if (!accountMap.has(categoryId)) {
          accountMap.set(categoryId, {
            account,
            transactions: [],
            total_debits: 0,
            total_credits: 0
          });
        }
      });

      // 取引データを各勘定科目に分配
      transactions?.forEach(transaction => {
        const categoryId = transaction.category_id;
        const entry = accountMap.get(categoryId)!;
        const amount = Math.abs(transaction.amount);

        // 複式簿記の原則に従って借方・貸方を決定
        const categoryType = transaction.account_categories.category_type;
        const transactionType = Number(transaction.amount) < 0 ? 'expense' : 'revenue';
        
        let debit_amount = 0;
        let credit_amount = 0;

        if (transactionType === 'expense') {
          if (categoryType === 'expense') {
            debit_amount = amount;
            entry.total_debits += amount;
          } else if (categoryType === 'asset') {
            credit_amount = amount;
            entry.total_credits += amount;
          }
        } else if (transactionType === 'revenue') {
          if (categoryType === 'revenue') {
            credit_amount = amount;
            entry.total_credits += amount;
          } else if (categoryType === 'asset') {
            debit_amount = amount;
            entry.total_debits += amount;
          }
        }

        const ledgerTransaction: LedgerTransaction = {
          id: transaction.id,
          transaction_date: transaction.transaction_date,
          description: transaction.description,
          amount: transaction.amount,
          transaction_type: (Number(transaction.amount) < 0 ? 'expense' : 'revenue') as 'revenue' | 'expense',
          is_business: transaction.is_business,
          running_balance: 0, // 後で計算
          debit_amount,
          credit_amount
        };

        entry.transactions.push(ledgerTransaction);
      });

      // 各勘定科目の累計残高を計算
      const ledgerAccounts: LedgerAccount[] = [];
      
      accountMap.forEach((entry, accountId) => {
        const { account, transactions, total_debits, total_credits } = entry;
        
        // 取引を日付順にソート
        transactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
        
        // 累計残高を計算
        let running_balance = 0;
        transactions.forEach(transaction => {
          if (transaction.debit_amount && transaction.debit_amount > 0) {
            running_balance += transaction.debit_amount;
          }
          if (transaction.credit_amount && transaction.credit_amount > 0) {
            running_balance -= transaction.credit_amount;
          }
          transaction.running_balance = running_balance;
        });

        const ledgerAccount: LedgerAccount = {
          account_id: accountId,
          account_name: account.name,
          account_code: account.code,
          category_type: account.category_type,
          opening_balance: 0, // 簡略化のため0から開始
          closing_balance: running_balance,
          transactions,
          total_debits,
          total_credits
        };

        ledgerAccounts.push(ledgerAccount);
      });

      // 残高の大きい順にソート
      ledgerAccounts.sort((a, b) => Math.abs(b.closing_balance) - Math.abs(a.closing_balance));

      setLedgerData(ledgerAccounts);

    } catch (error) {
      console.error('総勘定元帳データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

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

  const exportLedger = () => {
    if (ledgerData.length === 0) return;

    let csvContent = '';
    
    ledgerData.forEach(account => {
      csvContent += `\n勘定科目: ${account.account_name} (${getCategoryLabel(account.category_type)})\n`;
      csvContent += `科目コード,日付,摘要,借方金額,貸方金額,残高\n`;
      
      account.transactions.forEach(transaction => {
        csvContent += `${account.account_code || ''},${formatDate(transaction.transaction_date)},${transaction.description},${transaction.debit_amount || 0},${transaction.credit_amount || 0},${transaction.running_balance}\n`;
      });
      
      csvContent += `合計,,,${account.total_debits},${account.total_credits},${account.closing_balance}\n`;
      csvContent += '\n';
    });

    const { label } = getPeriodDates(selectedPeriod);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.download = `総勘定元帳_${label}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLedgerData = ledgerData.filter(account => 
    searchTerm === '' || 
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_code?.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <h1 className="text-3xl font-bold text-foreground mb-2">総勘定元帳</h1>
                    <p className="text-muted-foreground">
                      勘定科目別の取引履歴と残高推移を確認できます
                    </p>
                  </div>
                  <Button 
                    onClick={exportLedger} 
                    disabled={ledgerData.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV出力
                  </Button>
                </div>
              </div>

              {/* フィルター */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>対象期間</Label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current_month">今月</SelectItem>
                          <SelectItem value="last_month">先月</SelectItem>
                          <SelectItem value="current_year">今年</SelectItem>
                          <SelectItem value="last_year">昨年</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>勘定科目</Label>
                      <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          {accountCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} ({getCategoryLabel(category.category_type)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>検索</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="勘定科目名で検索"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-end">
                      <Button
                        onClick={fetchLedgerData}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        {isLoading ? '読み込み中...' : '更新'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isLoading ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">総勘定元帳を作成中...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredLedgerData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">総勘定元帳データがありません</p>
                      <p className="text-sm">選択した条件に該当する取引データがありません</p>
                    </div>
                  ) : (
                    filteredLedgerData.map((account) => (
                      <Card key={account.account_id} className="overflow-hidden">
                        <CardHeader className="bg-muted/30">
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <span className={getCategoryColor(account.category_type)}>
                                  {account.account_name}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-muted">
                                  {getCategoryLabel(account.category_type)}
                                </span>
                              </CardTitle>
                              {account.account_code && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  科目コード: {account.account_code}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">期末残高</div>
                              <div className={`text-lg font-bold ${
                                account.closing_balance > 0 ? 'text-blue-600' : 
                                account.closing_balance < 0 ? 'text-red-600' : ''
                              }`}>
                                {formatCurrency(account.closing_balance)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b text-sm">
                                  <th className="text-left p-2">日付</th>
                                  <th className="text-left p-2">摘要</th>
                                  <th className="text-right p-2">借方</th>
                                  <th className="text-right p-2">貸方</th>
                                  <th className="text-right p-2">残高</th>
                                  <th className="text-center p-2">区分</th>
                                </tr>
                              </thead>
                              <tbody>
                                {account.transactions.map((transaction) => (
                                  <tr key={transaction.id} className="border-b hover:bg-muted/20">
                                    <td className="p-2 text-sm">
                                      {formatDate(transaction.transaction_date)}
                                    </td>
                                    <td className="p-2 text-sm font-medium">
                                      {transaction.description}
                                    </td>
                                    <td className="p-2 text-right font-mono text-sm">
                                      {transaction.debit_amount && transaction.debit_amount > 0 ? (
                                        <span className="text-blue-600">
                                          {formatCurrency(transaction.debit_amount)}
                                        </span>
                                      ) : '-'}
                                    </td>
                                    <td className="p-2 text-right font-mono text-sm">
                                      {transaction.credit_amount && transaction.credit_amount > 0 ? (
                                        <span className="text-red-600">
                                          {formatCurrency(transaction.credit_amount)}
                                        </span>
                                      ) : '-'}
                                    </td>
                                    <td className={`p-2 text-right font-mono text-sm font-medium ${
                                      transaction.running_balance > 0 ? 'text-blue-600' : 
                                      transaction.running_balance < 0 ? 'text-red-600' : ''
                                    }`}>
                                      {formatCurrency(transaction.running_balance)}
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        transaction.is_business 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {transaction.is_business ? '事業' : '個人'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {/* 合計行 */}
                                <tr className="border-t-2 bg-muted/30 font-semibold">
                                  <td className="p-2" colSpan={2}>合計</td>
                                  <td className="p-2 text-right font-mono text-blue-600">
                                    {formatCurrency(account.total_debits)}
                                  </td>
                                  <td className="p-2 text-right font-mono text-red-600">
                                    {formatCurrency(account.total_credits)}
                                  </td>
                                  <td className={`p-2 text-right font-mono font-bold ${
                                    account.closing_balance > 0 ? 'text-blue-600' : 
                                    account.closing_balance < 0 ? 'text-red-600' : ''
                                  }`}>
                                    {formatCurrency(account.closing_balance)}
                                  </td>
                                  <td className="p-2"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
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
            総勘定元帳はデスクトップでご利用ください。
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}