'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { 
  Car, 
  Phone, 
  Coffee, 
  BookOpen, 
  Home, 
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';
import type { UserExpensePreferences } from '@/lib/types/user-profile.types';

export default function ExpensePreferencesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<Partial<UserExpensePreferences>>({
    // 交通費設定
    own_car_usage: 'none',
    car_business_ratio: 0,
    public_transport_default: 'personal',
    taxi_policy: 'flexible',
    parking_default: 'personal',
    
    // 通信費設定
    phone_business_ratio: 0,
    internet_business_ratio: 0,
    
    // 食事・接待費設定
    client_meeting_meals: 'always_business',
    business_lunch_policy: 'personal',
    coffee_work_policy: 'personal',
    energy_drink_policy: 'personal',
    
    // 学習・教育費設定
    technical_books_default: 'business',
    online_courses_default: 'business',
    conferences_default: 'business',
    
    // 設備・備品設定
    home_office_ratio: 0,
    depreciation_threshold: 100000,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }
    
    if (user) {
      loadPreferences();
    }
  }, [user, loading, router]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_expense_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      showToast('error', 'エラー', '設定の読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = (field: keyof UserExpensePreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_expense_preferences')
        .upsert({
          user_id: user.id,
          ...preferences
        });

      if (error) throw error;

      showToast('success', '設定保存完了', '経費設定が正常に保存されました');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast('error', 'エラー', '設定の保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPreferences({
      own_car_usage: 'none',
      car_business_ratio: 0,
      public_transport_default: 'personal',
      taxi_policy: 'flexible',
      parking_default: 'personal',
      phone_business_ratio: 0,
      internet_business_ratio: 0,
      client_meeting_meals: 'always_business',
      business_lunch_policy: 'personal',
      coffee_work_policy: 'personal',
      energy_drink_policy: 'personal',
      technical_books_default: 'business',
      online_courses_default: 'business',
      conferences_default: 'business',
      home_office_ratio: 0,
      depreciation_threshold: 100000,
    });
  };

  if (loading || isLoading) {
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
      
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">経費設定</h1>
                  <p className="text-muted-foreground">
                    自動分類の精度を向上させるため、あなたの事業に合わせた経費設定を行ってください
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetToDefaults}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    デフォルトに戻す
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        設定を保存
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-6">
                {/* 交通費設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      交通費設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>自家用車の使用</Label>
                        <Select 
                          value={preferences.own_car_usage} 
                          onValueChange={(value) => updatePreference('own_car_usage', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">使用しない</SelectItem>
                            <SelectItem value="business_only">事業専用</SelectItem>
                            <SelectItem value="mixed">事業・個人兼用</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {preferences.own_car_usage === 'mixed' && (
                        <div className="space-y-2">
                          <Label>事業使用割合 (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={preferences.car_business_ratio}
                            onChange={(e) => updatePreference('car_business_ratio', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>公共交通機関のデフォルト</Label>
                        <Select 
                          value={preferences.public_transport_default} 
                          onValueChange={(value) => updatePreference('public_transport_default', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">事業経費</SelectItem>
                            <SelectItem value="personal">個人支出</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>タクシー利用方針</Label>
                        <Select 
                          value={preferences.taxi_policy} 
                          onValueChange={(value) => updatePreference('taxi_policy', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="strict">厳格（明確な業務目的のみ）</SelectItem>
                            <SelectItem value="flexible">柔軟（時間・状況考慮）</SelectItem>
                            <SelectItem value="always_ok">常に事業経費</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>駐車場代のデフォルト</Label>
                        <Select 
                          value={preferences.parking_default} 
                          onValueChange={(value) => updatePreference('parking_default', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">事業経費</SelectItem>
                            <SelectItem value="personal">個人支出</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 通信費設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      通信費設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>携帯電話の事業使用割合 (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={preferences.phone_business_ratio}
                          onChange={(e) => updatePreference('phone_business_ratio', parseInt(e.target.value) || 0)}
                          placeholder="0-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>インターネットの事業使用割合 (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={preferences.internet_business_ratio}
                          onChange={(e) => updatePreference('internet_business_ratio', parseInt(e.target.value) || 0)}
                          placeholder="0-100"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 食事・接待費設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coffee className="h-5 w-5" />
                      食事・飲食費設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>取引先との会食</Label>
                        <Select 
                          value={preferences.client_meeting_meals} 
                          onValueChange={(value) => updatePreference('client_meeting_meals', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always_business">常に事業経費</SelectItem>
                            <SelectItem value="case_by_case">ケースバイケース</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>業務中の昼食</Label>
                        <Select 
                          value={preferences.business_lunch_policy} 
                          onValueChange={(value) => updatePreference('business_lunch_policy', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">事業経費</SelectItem>
                            <SelectItem value="personal">個人支出</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>作業中のカフェ代</Label>
                        <Select 
                          value={preferences.coffee_work_policy} 
                          onValueChange={(value) => updatePreference('coffee_work_policy', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">事業経費</SelectItem>
                            <SelectItem value="personal">個人支出</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>エナジードリンク等</Label>
                        <Select 
                          value={preferences.energy_drink_policy} 
                          onValueChange={(value) => updatePreference('energy_drink_policy', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">事業経費</SelectItem>
                            <SelectItem value="personal">個人支出</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 学習・教育費設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      学習・教育費設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>技術書・専門書</Label>
                        <Select 
                          value={preferences.technical_books_default} 
                          onValueChange={(value) => updatePreference('technical_books_default', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">事業経費</SelectItem>
                            <SelectItem value="personal">個人支出</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>オンライン講座</Label>
                        <Select 
                          value={preferences.online_courses_default} 
                          onValueChange={(value) => updatePreference('online_courses_default', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">事業経費</SelectItem>
                            <SelectItem value="personal">個人支出</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>カンファレンス・セミナー</Label>
                        <Select 
                          value={preferences.conferences_default} 
                          onValueChange={(value) => updatePreference('conferences_default', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">事業経費</SelectItem>
                            <SelectItem value="personal">個人支出</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 設備・備品設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      設備・備品設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>自宅オフィス使用割合 (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={preferences.home_office_ratio}
                          onChange={(e) => updatePreference('home_office_ratio', parseInt(e.target.value) || 0)}
                          placeholder="0-100"
                        />
                        <p className="text-xs text-muted-foreground">
                          家賃・光熱費等の按分割合
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>減価償却閾値（円）</Label>
                        <Input
                          type="number"
                          min="0"
                          value={preferences.depreciation_threshold}
                          onChange={(e) => updatePreference('depreciation_threshold', parseInt(e.target.value) || 0)}
                          placeholder="100000"
                        />
                        <p className="text-xs text-muted-foreground">
                          この金額以上の設備投資は減価償却として処理
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 これらの設定は、レシートや取引の自動分類時に適用されます。
                  設定後も個別に修正は可能です。より詳細なカスタムルールは設定ページで追加できます。
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden pb-16">
        <main className="p-4">
          {/* Mobile content would be similar but with responsive adjustments */}
          <div className="text-center text-muted-foreground">
            モバイル版は準備中です。デスクトップでご利用ください。
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}