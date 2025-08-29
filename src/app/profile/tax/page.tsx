'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/toast';
import { Calculator, Save, ArrowLeft } from 'lucide-react';

export default function TaxSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    tax_filing_method: '',
    tax_accountant_name: '',
    tax_accountant_phone: '',
    tax_accountant_email: '',
    consumption_tax_eligible: false,
    consumption_tax_calculation: 'honkoku',
    blue_return_eligible: false,
    blue_return_amount: '65',
    notes: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      showToast('success', '保存完了', '税務設定を保存しました');
    } catch (error) {
      showToast('error', 'エラー', '保存中にエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  戻る
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">税務・申告設定</h1>
                  <p className="text-muted-foreground">
                    青色申告、消費税等の税務関連設定を行ってください
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 申告方法 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      申告方法
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="tax_filing_method">申告方法</Label>
                      <Select onValueChange={(value) => handleInputChange('tax_filing_method', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="申告方法を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="white">白色申告</SelectItem>
                          <SelectItem value="blue">青色申告</SelectItem>
                          <SelectItem value="corporate">法人税申告</SelectItem>
                          <SelectItem value="other">その他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="blue_return_eligible"
                        checked={formData.blue_return_eligible}
                        onCheckedChange={(checked) => handleInputChange('blue_return_eligible', checked)}
                      />
                      <Label htmlFor="blue_return_eligible">青色申告特別控除対象</Label>
                    </div>

                    {formData.blue_return_eligible && (
                      <div>
                        <Label htmlFor="blue_return_amount">青色申告特別控除額</Label>
                        <Select onValueChange={(value) => handleInputChange('blue_return_amount', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="控除額を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10万円</SelectItem>
                            <SelectItem value="55">55万円</SelectItem>
                            <SelectItem value="65">65万円</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 消費税設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle>消費税設定</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="consumption_tax_eligible"
                        checked={formData.consumption_tax_eligible}
                        onCheckedChange={(checked) => handleInputChange('consumption_tax_eligible', checked)}
                      />
                      <Label htmlFor="consumption_tax_eligible">消費税課税事業者</Label>
                    </div>

                    {formData.consumption_tax_eligible && (
                      <div>
                        <Label htmlFor="consumption_tax_calculation">消費税計算方法</Label>
                        <Select onValueChange={(value) => handleInputChange('consumption_tax_calculation', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="計算方法を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="honkoku">本格消費税計算</SelectItem>
                            <SelectItem value="kantan">簡易課税</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 税理士情報 */}
                <Card>
                  <CardHeader>
                    <CardTitle>税理士情報</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="tax_accountant_name">税理士氏名</Label>
                      <Input
                        id="tax_accountant_name"
                        value={formData.tax_accountant_name}
                        onChange={(e) => handleInputChange('tax_accountant_name', e.target.value)}
                        placeholder="税理士の氏名を入力"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tax_accountant_phone">電話番号</Label>
                      <Input
                        id="tax_accountant_phone"
                        value={formData.tax_accountant_phone}
                        onChange={(e) => handleInputChange('tax_accountant_phone', e.target.value)}
                        placeholder="電話番号を入力"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tax_accountant_email">メールアドレス</Label>
                      <Input
                        id="tax_accountant_email"
                        type="email"
                        value={formData.tax_accountant_email}
                        onChange={(e) => handleInputChange('tax_accountant_email', e.target.value)}
                        placeholder="メールアドレスを入力"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 備考 */}
                <Card>
                  <CardHeader>
                    <CardTitle>備考・メモ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="notes">税務に関する備考</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="税務関連の備考やメモを入力"
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 保存ボタン */}
                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => router.back()}>
                    キャンセル
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    保存
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <div className="md:hidden pb-16">
        <main className="p-4">
          <div className="text-center text-muted-foreground">
            税務設定のモバイル版は準備中です。デスクトップでご利用ください。
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}