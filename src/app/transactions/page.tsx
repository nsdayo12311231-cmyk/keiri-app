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
import { Calculator, Plus, Receipt, Building2, User, Calendar, Edit3, Trash2, MoreVertical, Filter, ArrowUpDown, Search, X } from 'lucide-react';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { TransactionEditDialog } from '@/components/transactions/transaction-edit-dialog';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  is_business: boolean;
  created_at: string;
  category_id?: string;
  transaction_type?: 'expense' | 'revenue';
}

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'business' | 'personal'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      
      try {
        setLoadingTransactions(true);
        let query = supabase
          .from('transactions')
          .select('id, amount, description, transaction_date, is_business, created_at, category_id, transaction_type')
          .eq('user_id', user.id);
        
        // フィルタリング
        if (filterType === 'business') {
          query = query.eq('is_business', true);
        } else if (filterType === 'personal') {
          query = query.eq('is_business', false);
        }
        
        // ソート
        if (sortBy === 'date') {
          query = query.order('transaction_date', { ascending: sortOrder === 'asc' });
        } else {
          query = query.order('amount', { ascending: sortOrder === 'asc' });
        }
        
        // 作成日時で二次ソート
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [user, filterType, sortBy, sortOrder]);

  // 検索機能のための取引フィルタリング
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.amount.toString().includes(searchTerm)
      );
      setFilteredTransactions(filtered);
    }
  }, [transactions, searchTerm]);

  const handleTransactionSaved = () => {
    // 取引が保存された時に一覧を再読み込み
    if (user) {
      const fetchTransactions = async () => {
        try {
          const { data, error } = await supabase
            .from('transactions')
            .select('id, amount, description, transaction_date, is_business, created_at, category_id, transaction_type')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          setTransactions(data || []);
        } catch (error) {
          console.error('Error fetching transactions:', error);
        }
      };
      fetchTransactions();
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('この取引を削除しますか？')) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // 一覧を再読み込み
      handleTransactionSaved();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
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
                  <h1 className="text-3xl font-bold text-foreground mb-2">取引管理</h1>
                  <p className="text-muted-foreground">取引の登録・管理を行います</p>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  新しい取引
                </Button>
              </div>

              <div className="space-y-8">
                <TransactionForm onSuccess={handleTransactionSaved} />
                
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center mb-4">
                      <CardTitle>取引一覧</CardTitle>
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="取引を検索（説明文・金額）..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as 'all' | 'business' | 'personal')}
                          className="px-3 py-1 border rounded-md text-sm"
                        >
                          <option value="all">すべて</option>
                          <option value="business">事業用</option>
                          <option value="personal">個人用</option>
                        </select>
                        <select
                          value={`${sortBy}_${sortOrder}`}
                          onChange={(e) => {
                            const [field, order] = e.target.value.split('_');
                            setSortBy(field as 'date' | 'amount');
                            setSortOrder(order as 'asc' | 'desc');
                          }}
                          className="px-3 py-1 border rounded-md text-sm"
                        >
                          <option value="date_desc">日付順（新→古）</option>
                          <option value="date_asc">日付順（古→新）</option>
                          <option value="amount_desc">金額順（高→低）</option>
                          <option value="amount_asc">金額順（低→高）</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingTransactions ? (
                      <div className="text-center py-8">
                        <Calculator className="h-8 w-8 mx-auto mb-4 animate-spin" />
                        <p className="text-muted-foreground">読み込み中...</p>
                      </div>
                    ) : filteredTransactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Receipt className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        {searchTerm ? (
                          <>
                            <p className="text-lg mb-2">検索結果が見つかりません</p>
                            <p className="text-sm">検索条件を変更してください</p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg mb-2">まだ取引データがありません</p>
                            <p className="text-sm">上のフォームから取引を入力してください</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredTransactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                {transaction.is_business ? (
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <User className="h-5 w-5 text-green-600" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {transaction.is_business ? '事業' : '個人'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(transaction.transaction_date)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="font-semibold text-lg">{formatAmount(transaction.amount)}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTransaction(transaction)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">取引管理</h1>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </div>

          <div className="space-y-6">
            <TransactionForm onSuccess={handleTransactionSaved} />
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">取引一覧</h2>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="取引を検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10 text-sm"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as 'all' | 'business' | 'personal')}
                      className="px-2 py-1 border rounded-md text-xs flex-1"
                    >
                      <option value="all">すべて</option>
                      <option value="business">事業用</option>
                      <option value="personal">個人用</option>
                    </select>
                    <select
                      value={`${sortBy}_${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('_');
                        setSortBy(field as 'date' | 'amount');
                        setSortOrder(order as 'asc' | 'desc');
                      }}
                      className="px-2 py-1 border rounded-md text-xs flex-1"
                    >
                      <option value="date_desc">新→古</option>
                      <option value="date_asc">古→新</option>
                      <option value="amount_desc">高→低</option>
                      <option value="amount_asc">低→高</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loadingTransactions ? (
                  <div className="text-center py-8">
                    <Calculator className="h-8 w-8 mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">読み込み中...</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {searchTerm ? (
                      <>
                        <p className="mb-2">検索結果が見つかりません</p>
                        <p className="text-sm">検索条件を変更してください</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-2">取引データがありません</p>
                        <p className="text-sm">上のフォームから取引を入力してください</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {transaction.is_business ? (
                            <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <User className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(transaction.transaction_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold">{formatAmount(transaction.amount)}</p>
                            <span className="text-xs text-muted-foreground">
                              {transaction.is_business ? '事業' : '個人'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNav />
      </div>
      
      <TransactionEditDialog
        transaction={editingTransaction}
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        onSuccess={handleTransactionSaved}
      />
    </div>
  );
}