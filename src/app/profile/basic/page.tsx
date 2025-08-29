'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { 
  User, 
  Save, 
  ArrowLeft,
  Mail,
  Calendar,
  Building
} from 'lucide-react';

interface UserBasicProfile {
  id: string;
  email: string;
  full_name?: string;
  business_type?: string;
  tax_year?: number;
}

export default function BasicProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<UserBasicProfile>>({
    email: '',
    full_name: '',
    business_type: '',
    tax_year: new Date().getFullYear(),
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }
    
    if (user) {
      loadProfile();
    }
  }, [user, loading, router]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // プロフィールが存在しない場合はデフォルト値を設定
        setProfile({
          id: user.id,
          email: user.email || '',
          full_name: '',
          business_type: 'individual',
          tax_year: new Date().getFullYear(),
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('error', 'エラー', 'プロフィールの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = (field: keyof UserBasicProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          ...profile
        });

      if (error) throw error;

      showToast('success', '保存完了', 'プロフィールが正常に保存されました');
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('error', 'エラー', 'プロフィールの保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
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
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      設定に戻る
                    </Button>
                  </div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">基本プロフィール</h1>
                  <p className="text-muted-foreground">
                    アカウントの基本情報を管理してください
                  </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-6">
                {/* 基本情報 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      基本情報
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        メールアドレス
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email || user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        メールアドレスの変更はセキュリティ設定から行ってください
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full-name">氏名</Label>
                      <Input
                        id="full-name"
                        placeholder="山田 太郎"
                        value={profile.full_name || ''}
                        onChange={(e) => updateProfile('full_name', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        請求書や申告書に使用される名前です
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 事業情報 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      事業情報
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="business-type">事業形態</Label>
                      <select
                        id="business-type"
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        value={profile.business_type || ''}
                        onChange={(e) => updateProfile('business_type', e.target.value)}
                      >
                        <option value="">選択してください</option>
                        <option value="individual">個人事業主</option>
                        <option value="freelancer">フリーランス</option>
                        <option value="small_business">小規模事業者</option>
                        <option value="corporation">法人</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        より詳細な事業情報は「詳細プロフィール設定」で設定できます
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax-year" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        対象年度
                      </Label>
                      <Input
                        id="tax-year"
                        type="number"
                        min="2020"
                        max="2030"
                        value={profile.tax_year || new Date().getFullYear()}
                        onChange={(e) => updateProfile('tax_year', parseInt(e.target.value) || new Date().getFullYear())}
                      />
                      <p className="text-xs text-muted-foreground">
                        現在管理している会計年度
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 次のステップ案内 */}
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                  <CardHeader>
                    <CardTitle className="text-blue-700 dark:text-blue-300">
                      次のステップ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        基本プロフィールの設定が完了したら、より詳細な設定を行いましょう：
                      </p>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>🏢 <strong>詳細プロフィール</strong> - 業種・働き方の詳細設定</li>
                        <li>💰 <strong>経費設定</strong> - 自動分類ルールのカスタマイズ</li>
                        <li>📋 <strong>税務設定</strong> - 申告方法や税理士情報</li>
                      </ul>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" asChild>
                          <a href="/profile/setup">詳細プロフィール設定</a>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href="/profile/expenses">経費設定</a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden pb-16">
        <main className="p-4">
          <div className="text-center text-muted-foreground">
            基本プロフィール設定のモバイル版は準備中です。デスクトップでご利用ください。
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}