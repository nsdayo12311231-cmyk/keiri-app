'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { getExpenseCategories, getRevenueCategories } from '@/data/account-categories';
import { Calendar, DollarSign, FileText, Building2, User, Tag } from 'lucide-react';

interface TransactionFormProps {
  onSuccess?: () => void;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    isBusiness: true,
    categoryId: '',
    transactionType: 'expense' as 'expense' | 'revenue',
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // ユーザープロフィールをupsert（存在しなければ作成、存在すれば何もしない）
      await supabase
        .from('user_profiles')
        .upsert([
          {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || '',
            business_type: 'freelancer',
          }
        ], {
          onConflict: 'id'
        });

      // 取引を保存
      const { error } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            amount: parseFloat(formData.amount),
            description: formData.description,
            transaction_date: formData.date,
            is_business: formData.isBusiness,
            category_id: formData.categoryId || null,
            transaction_type: formData.transactionType,
          },
        ]);

      if (error) throw error;

      setFormData({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        isBusiness: true,
        categoryId: '',
        transactionType: 'expense',
      });

      showToast('success', '取引を保存しました', '新しい取引が正常に記録されました。');
      onSuccess?.();
    } catch (error) {
      console.error('取引の保存に失敗しました:', error);
      showToast('error', '保存に失敗しました', '取引の保存中にエラーが発生しました。もう一度お試しください。');
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          新しい取引を記録
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                金額
              </Label>
              <Input
                id="amount"
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
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                取引日
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">取引内容</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="取引の詳細を入力してください"
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-type" className="flex items-center gap-2">
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
              <Label htmlFor="category" className="flex items-center gap-2">
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? '保存中...' : '取引を保存'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}