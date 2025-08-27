'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { getExpenseCategories, getRevenueCategories } from '@/data/account-categories';
import { Building2, User, Tag } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  is_business: boolean;
  category_id?: string;
  transaction_type?: 'expense' | 'revenue';
}

interface TransactionEditDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionEditDialog({ transaction, isOpen, onClose, onSuccess }: TransactionEditDialogProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: transaction?.amount?.toString() || '',
    description: transaction?.description || '',
    date: transaction?.transaction_date || '',
    isBusiness: transaction?.is_business || true,
    categoryId: transaction?.category_id || '',
    transactionType: (transaction?.transaction_type || 'expense') as 'expense' | 'revenue',
  });

  // ダイアログが開かれるたびにフォームデータをリセット
  useEffect(() => {
    if (transaction && isOpen) {
      setFormData({
        amount: transaction.amount.toString(),
        description: transaction.description,
        date: transaction.transaction_date,
        isBusiness: transaction.is_business,
        categoryId: transaction.category_id || '',
        transactionType: (transaction.transaction_type || 'expense') as 'expense' | 'revenue',
      });
    }
  }, [transaction, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(formData.amount),
          description: formData.description,
          transaction_date: formData.date,
          is_business: formData.isBusiness,
          category_id: formData.categoryId || null,
          transaction_type: formData.transactionType,
        })
        .eq('id', transaction.id);

      if (error) throw error;

      showToast('success', '取引を更新しました', '取引情報が正常に更新されました。');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
      showToast('error', '更新に失敗しました', '取引の更新中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>取引を編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">金額</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0"
                required
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">取引日</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">取引内容</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="取引の詳細を入力してください"
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-transaction-type" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                取引種別
              </Label>
              <Select value={formData.transactionType} onValueChange={(value) => {
                handleInputChange('transactionType', value);
                handleInputChange('categoryId', ''); // カテゴリをリセット
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="取引種別を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="revenue">収入</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                勘定科目
              </Label>
              <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="勘定科目を選択" />
                </SelectTrigger>
                <SelectContent>
                  {formData.transactionType === 'expense' 
                    ? getExpenseCategories(formData.isBusiness).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.code} - {category.name}
                        </SelectItem>
                      ))
                    : getRevenueCategories(formData.isBusiness).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.code} - {category.name}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {formData.isBusiness ? (
                <Building2 className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-green-600" />
              )}
              <div>
                <Label className="text-base font-medium">
                  {formData.isBusiness ? '事業用' : '個人用'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {formData.isBusiness ? '経費として計上されます' : '個人的な支出です'}
                </p>
              </div>
            </div>
            <Switch
              checked={formData.isBusiness}
              onCheckedChange={(checked) => {
                handleInputChange('isBusiness', checked);
                handleInputChange('categoryId', ''); // カテゴリをリセット
              }}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? '更新中...' : '更新'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}