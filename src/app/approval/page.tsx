'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SidebarGuide } from '@/components/layout/sidebar-guide';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calculator, 
  Check, 
  X, 
  Clock, 
  Building2, 
  User, 
  Calendar,
  DollarSign,
  CheckCheck,
  AlertTriangle,
  Trash2
} from 'lucide-react';

interface UnconfirmedTransaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  is_business: boolean;
  category_id?: string;
  account_categories?: {
    name: string;
    code: string;
    category_type: string;
  };
  created_at: string;
}

export default function ApprovalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<UnconfirmedTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchUnconfirmedTransactions();
    }
  }, [user]);

  const fetchUnconfirmedTransactions = async () => {
    if (!user) return;

    try {
      setLoadingTransactions(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          description,
          transaction_date,
          is_business,
          category_id,
          created_at,
          account_categories (
            name,
            code,
            category_type
          )
        `)
        .eq('user_id', user.id)
        .eq('is_confirmed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching unconfirmed transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleSelectTransaction = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      setProcessingApproval(true);
      
      const { data, error } = await supabase
        .from('transactions')
        .update({ 
          is_confirmed: true
        })
        .in('id', Array.from(selectedIds))
        .select();

      if (error) throw error;

      console.log('承認処理結果:', {
        updated: data?.length || 0,
        selectedIds: Array.from(selectedIds),
        updatedRecords: data
      });

      // 成功後、リストを更新
      await fetchUnconfirmedTransactions();
      setSelectedIds(new Set());
      
      alert(`${selectedIds.size}件の取引を承認しました`);
    } catch (error) {
      console.error('Error approving transactions:', error);
      alert('承認処理でエラーが発生しました');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchUnconfirmedTransactions();
      alert('取引を削除しました');
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      alert('削除処理でエラーが発生しました');
    }
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

      // 成功後、リストを更新
      await fetchUnconfirmedTransactions();
      setSelectedIds(new Set());
      
      alert(`${selectedIds.size}件の取引を削除しました`);
    } catch (error) {
      console.error('Error deleting transactions:', error);
      alert('削除処理でエラーが発生しました');
    } finally {
      setProcessingDelete(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
                  取引承認
                </h1>
                <p className="text-muted-foreground">
                  未確認の取引を確認して承認してください
                </p>
              </div>

              {/* 統計サマリー */}
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      未確認取引
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{transactions.length}</div>
                    <p className="text-xs text-muted-foreground">
                      確認待ちの取引
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      選択中
                    </CardTitle>
                    <CheckCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedIds.size}</div>
                    <p className="text-xs text-muted-foreground">
                      承認予定の取引
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      未確認合計金額
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        transactions
                          .filter(t => Number(t.amount) < 0)
                          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      支出の合計
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 一括操作バー */}
              {transactions.length > 0 && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={selectedIds.size === transactions.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">
                          すべて選択
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={handleApproveSelected}
                          disabled={selectedIds.size === 0 || processingApproval || processingDelete}
                          size="sm"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {processingApproval ? '処理中...' : `${selectedIds.size}件を承認`}
                        </Button>
                        <Button
                          onClick={handleDeleteSelected}
                          disabled={selectedIds.size === 0 || processingDelete || processingApproval}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {processingDelete ? '削除中...' : `${selectedIds.size}件を削除`}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 取引一覧 */}
              <Card>
                <CardHeader>
                  <CardTitle>未確認取引一覧</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTransactions ? (
                    <div className="text-center py-12">
                      <Calculator className="h-12 w-12 mx-auto mb-4 animate-spin" />
                      <p className="text-muted-foreground">読み込み中...</p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">すべての取引が確認済みです</p>
                      <p className="text-sm">新しい取引が追加されると、ここに表示されます</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            selectedIds.has(transaction.id) 
                              ? 'bg-primary/5 border-primary/20' 
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <Checkbox
                                checked={selectedIds.has(transaction.id)}
                                onCheckedChange={(checked) => 
                                  handleSelectTransaction(transaction.id, !!checked)
                                }
                              />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium text-foreground">
                                    {transaction.description}
                                  </h4>
                                  
                                  <Badge variant={Number(transaction.amount) < 0 ? 'destructive' : 'default'}>
                                    {Number(transaction.amount) < 0 ? '支出' : '収入'}
                                  </Badge>
                                  
                                  <Badge variant={transaction.is_business ? 'default' : 'secondary'}>
                                    {transaction.is_business ? '事業' : '個人'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(transaction.transaction_date)}
                                  </div>
                                  
                                  {transaction.account_categories && (
                                    <div className="flex items-center gap-1">
                                      <span>{transaction.account_categories.name}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-1">
                                    {transaction.is_business ? (
                                      <Building2 className="h-3 w-3" />
                                    ) : (
                                      <User className="h-3 w-3" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-lg font-semibold text-foreground mb-2">
                                {formatCurrency(transaction.amount)}
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRejectTransaction(transaction.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
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
        </div>
        
        {/* サイドバーガイド */}
        <SidebarGuide />
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden">
        <Header />
        <main className="p-4 pb-20">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">取引承認</h1>
            <p className="text-sm text-muted-foreground">未確認の取引を確認</p>
          </div>

          {/* モバイル用統計 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">未確認</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{transactions.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">選択中</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{selectedIds.size}</div>
              </CardContent>
            </Card>
          </div>

          {/* モバイル用一括操作 */}
          {transactions.length > 0 && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedIds.size === transactions.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm">すべて選択</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size}件選択中
                    </span>
                  </div>
                  
                  {selectedIds.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handleApproveSelected}
                        disabled={processingApproval || processingDelete}
                        size="sm"
                        className="flex-1"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        {processingApproval ? '処理中...' : '承認'}
                      </Button>
                      <Button
                        onClick={handleDeleteSelected}
                        disabled={processingDelete || processingApproval}
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {processingDelete ? '削除中...' : '削除'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* モバイル用取引一覧 */}
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">すべて確認済みです</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className={
                  selectedIds.has(transaction.id) ? 'border-primary bg-primary/5' : ''
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          checked={selectedIds.has(transaction.id)}
                          onCheckedChange={(checked) => 
                            handleSelectTransaction(transaction.id, !!checked)
                          }
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.transaction_date)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(transaction.amount)}</p>
                        <div className="flex space-x-1 mt-1">
                          <Badge variant={Number(transaction.amount) < 0 ? 'destructive' : 'default'} className="text-xs">
                            {Number(transaction.amount) < 0 ? '支出' : '収入'}
                          </Badge>
                        </div>
                      </div>
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