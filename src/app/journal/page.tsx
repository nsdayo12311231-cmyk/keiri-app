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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calculator, 
  FileText, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Building2,
  User,
  Filter,
  Download,
  Edit3,
  Trash2
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
  is_business: boolean;
  is_confirmed: boolean;
  category_id?: string;
  account_categories?: {
    name: string;
    code: string;
    category_type: string;
  };
}

interface AccountCategory {
  id: string;
  name: string;
  category_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
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
  const [accountCategories, setAccountCategories] = useState<AccountCategory[]>([]);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchJournalEntries();
      fetchAccountCategories();
    }
  }, [user, selectedYear, selectedMonth, filterType]);

  const fetchAccountCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('account_categories')
        .select('id, name, category_type')
        .order('category_type')
        .order('name');

      if (error) throw error;
      setAccountCategories(data || []);
    } catch (error) {
      console.error('勘定科目取得エラー:', error);
    }
  };

  const generateJournalEntry = (transaction: Transaction): JournalEntry => {
    const transactionType = Number(transaction.amount) < 0 ? 'expense' : 'revenue';
    const accountInfo = ACCOUNT_MAPPING[transactionType][transaction.is_business ? 'business' : 'personal'];
    
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

      console.log('仕訳帳データ取得結果:', {
        total: data?.length || 0,
        data: data?.slice(0, 3), // 最初の3件をログ出力
        filters: { selectedYear, selectedMonth, filterType }
      });

      const entries = (data || []).map(generateJournalEntry);
      setJournalEntries(entries);
      
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransactionCategory = async (transactionId: string, categoryId: string) => {
    try {
      setUpdatingCategory(true);
      
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('id', transactionId);

      if (error) throw error;

      // 仕訳帳データを再取得
      await fetchJournalEntries();
      setEditModalOpen(false);
      setEditingEntry(null);
      
    } catch (error) {
      console.error('勘定科目更新エラー:', error);
      alert('勘定科目の更新に失敗しました');
    } finally {
      setUpdatingCategory(false);
    }
  };

  const handleEditEntry = async (entry: JournalEntry) => {
    // 取引詳細を取得
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          description,
          transaction_date,
          is_business,
          category_id,
          account_categories (
            name,
            category_type
          )
        `)
        .eq('id', entry.transaction_id)
        .single();
      
      if (error) throw error;
      
      setCurrentTransaction(transaction);
      setEditingEntry(entry);
      setEditModalOpen(true);
    } catch (error) {
      console.error('取引詳細取得エラー:', error);
      alert('取引詳細の取得に失敗しました');
    }
  };

  const getRelevantCategories = () => {
    if (!currentTransaction) return [];
    
    // 取引タイプに応じて適切な勘定科目をフィルタリング
    const currentTransactionType = Number(currentTransaction.amount) < 0 ? 'expense' : 'revenue';
    if (currentTransactionType === 'expense') {
      // 支出の場合: expense（費用）カテゴリのみ
      return accountCategories.filter(cat => cat.category_type === 'expense');
    } else if (currentTransactionType === 'revenue') {
      // 収入の場合: revenue（収益）カテゴリのみ
      return accountCategories.filter(cat => cat.category_type === 'revenue');
    }
    
    return accountCategories;
  };

  const getCategoryTypeLabel = (type: string) => {
    const labels = {
      asset: '資産',
      liability: '負債',
      equity: '純資産',
      revenue: '収益',
      expense: '費用'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(journalEntries.map(entry => entry.transaction_id));
      setSelectedIds(allIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectEntry = (transactionId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(transactionId)) {
      newSelectedIds.delete(transactionId);
    } else {
      newSelectedIds.add(transactionId);
    }
    setSelectedIds(newSelectedIds);
    setSelectAll(newSelectedIds.size === journalEntries.length);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmed = confirm(`選択した${selectedIds.size}件の取引を削除しますか？この操作は取り消せません。`);
    if (!confirmed) return;
    
    try {
      setProcessingDelete(true);
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      
      // 仕訳帳データを再取得
      await fetchJournalEntries();
      setSelectedIds(new Set());
      setSelectAll(false);
      
    } catch (error) {
      console.error('削除エラー:', error);
      alert('取引の削除に失敗しました');
    } finally {
      setProcessingDelete(false);
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

                    <div className="flex items-end space-x-2">
                      <Button
                        onClick={exportJournal}
                        disabled={journalEntries.length === 0}
                        className="flex-1"
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
                      {/* 選択コントロール */}
                      <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="selectAll"
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                          />
                          <Label htmlFor="selectAll" className="text-sm font-medium">
                            すべて選択
                          </Label>
                          {selectedIds.size > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {selectedIds.size}件選択中
                            </span>
                          )}
                        </div>
                        
                        {selectedIds.size > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelected}
                            disabled={processingDelete}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            {processingDelete ? '削除中...' : '選択項目を削除'}
                          </Button>
                        )}
                      </div>
                      
                      {/* テーブルヘッダー - レスポンシブ対応 */}
                      <div className="hidden xl:grid xl:grid-cols-9 gap-4 p-3 bg-muted/30 rounded-lg font-medium text-sm">
                        <div className="w-8"></div>
                        <div className="min-w-[80px]">日付</div>
                        <div className="min-w-[120px]">摘要</div>
                        <div className="min-w-[100px]">借方勘定</div>
                        <div className="min-w-[100px]">貸方勘定</div>
                        <div className="text-right min-w-[80px]">金額</div>
                        <div className="min-w-[60px]">区分</div>
                        <div className="min-w-[80px]">参照番号</div>
                        <div className="min-w-[60px]">操作</div>
                      </div>
                      
                      {/* モバイル・タブレット用ヘッダー */}
                      <div className="xl:hidden p-2 bg-muted/30 rounded-lg font-medium text-sm text-center">
                        仕訳エントリ一覧
                      </div>
                      
                      {/* 仕訳エントリ - デスクトップ用 */}
                      <div className="hidden xl:block">
                        {journalEntries.map((entry) => (
                          <div key={entry.id} className={`grid grid-cols-9 gap-4 p-3 border rounded-lg hover:bg-muted/20 ${
                            selectedIds.has(entry.transaction_id) ? 'bg-blue-50 border-blue-200' : ''
                          }`}>
                            <div className="flex items-center w-8">
                              <Checkbox
                                checked={selectedIds.has(entry.transaction_id)}
                                onCheckedChange={() => handleSelectEntry(entry.transaction_id)}
                              />
                            </div>
                            <div className="text-sm min-w-[80px] truncate">
                              {formatDate(entry.transaction_date)}
                            </div>
                            <div className="text-sm font-medium min-w-[120px] truncate" title={entry.description}>
                              {entry.description}
                            </div>
                            <div className="text-sm min-w-[100px]">
                              <div className="font-medium truncate" title={entry.debit_account_name}>{entry.debit_account_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{entry.debit_account}</div>
                            </div>
                            <div className="text-sm min-w-[100px]">
                              <div className="font-medium truncate" title={entry.credit_account_name}>{entry.credit_account_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{entry.credit_account}</div>
                            </div>
                            <div className="text-sm font-semibold text-right min-w-[80px]">
                              {formatCurrency(entry.amount)}
                            </div>
                            <div className="min-w-[60px]">
                              <Badge variant={entry.is_business ? 'default' : 'secondary'} className="text-xs">
                                {entry.is_business ? '事業' : '個人'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground min-w-[80px] truncate">
                              {entry.reference_number}
                            </div>
                            <div className="flex items-center justify-center w-[60px]">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEntry(entry)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 仕訳エントリ - モバイル/タブレット用 */}
                      <div className="xl:hidden space-y-3">
                        {journalEntries.map((entry) => (
                          <Card key={entry.id} className={`${
                            selectedIds.has(entry.transaction_id) ? 'bg-blue-50 border-blue-200' : ''
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-start space-x-3 flex-1">
                                  <Checkbox
                                    checked={selectedIds.has(entry.transaction_id)}
                                    onCheckedChange={() => handleSelectEntry(entry.transaction_id)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm break-words">{entry.description}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{formatDate(entry.transaction_date)}</div>
                                  </div>
                                </div>
                                <div className="text-right ml-3 flex-shrink-0">
                                  <div className="font-semibold text-sm">{formatCurrency(entry.amount)}</div>
                                  <Badge variant={entry.is_business ? 'default' : 'secondary'} className="text-xs mt-1">
                                    {entry.is_business ? '事業' : '個人'}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                <div className="bg-green-50 p-3 rounded border">
                                  <div className="text-green-800 font-medium mb-1">借方</div>
                                  <div className="text-green-700 font-medium break-words">{entry.debit_account_name}</div>
                                  <div className="text-green-600 text-xs mt-1">{entry.debit_account}</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded border">
                                  <div className="text-blue-800 font-medium mb-1">貸方</div>
                                  <div className="text-blue-700 font-medium break-words">{entry.credit_account_name}</div>
                                  <div className="text-blue-600 text-xs mt-1">{entry.credit_account}</div>
                                </div>
                              </div>
                              
                              <div className="flex justify-between items-center text-xs">
                                <div className="text-muted-foreground">
                                  {entry.reference_number}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditEntry(entry)}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* 勘定科目編集モーダル */}
              <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>勘定科目の変更</DialogTitle>
                  </DialogHeader>
                  
                  {editingEntry && (
                    <div className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="font-medium">{editingEntry.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(editingEntry.transaction_date)} • {formatCurrency(editingEntry.amount)}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">現在の勘定科目</Label>
                          <div className="p-2 bg-muted/50 rounded border text-sm mt-1">
                            {currentTransaction?.account_categories?.name || '未設定'}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({getCategoryTypeLabel(currentTransaction?.account_categories?.category_type || '')})
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">新しい勘定科目を選択</Label>
                          <Select 
                            onValueChange={(value) => updateTransactionCategory(editingEntry.transaction_id, value)}
                            disabled={updatingCategory}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="勘定科目を選択してください" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {getRelevantCategories().map((category) => (
                                <SelectItem 
                                  key={category.id} 
                                  value={category.id}
                                  className="py-2 px-3"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{category.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {getCategoryTypeLabel(category.category_type)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded">
                          💡 {(currentTransaction && Number(currentTransaction.amount) < 0) ? '支出取引のため費用科目のみ表示' : '収入取引のため収益科目のみ表示'}
                        </div>
                      </div>
                      
                      {updatingCategory && (
                        <div className="text-center text-sm text-muted-foreground">
                          更新中...
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
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
              
              {/* モバイル用選択コントロール */}
              {journalEntries.length > 0 && (
                <div className="flex justify-between items-center p-2 bg-muted/20 rounded mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="selectAllMobile"
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="selectAllMobile" className="text-xs">
                      すべて選択
                    </Label>
                    {selectedIds.size > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedIds.size}件
                      </span>
                    )}
                  </div>
                  
                  {selectedIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={processingDelete}
                      className="h-6 px-2 text-xs"
                    >
                      <Trash2 className="mr-1 h-2 w-2" />
                      {processingDelete ? '削除中...' : '削除'}
                    </Button>
                  )}
                </div>
              )}
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
                <Card key={entry.id} className={`${
                  selectedIds.has(entry.transaction_id) ? 'bg-blue-50 border-blue-200' : ''
                }`}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start space-x-2 flex-1">
                        <Checkbox
                          checked={selectedIds.has(entry.transaction_id)}
                          onCheckedChange={() => handleSelectEntry(entry.transaction_id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{entry.description}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(entry.transaction_date)}</div>
                        </div>
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
                    
                    <div className="mt-2 flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        {entry.reference_number}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEntry(entry)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
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