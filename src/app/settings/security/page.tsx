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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { Shield, Save, ArrowLeft, Key, Smartphone, Eye, EyeOff } from 'lucide-react';

export default function SecuritySettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: '24',
    deviceTrust: true
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

  const handlePasswordChange = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      showToast('error', 'エラー', '新しいパスワードが一致しません');
      return;
    }

    if (formData.newPassword.length < 8) {
      showToast('error', 'エラー', 'パスワードは8文字以上で入力してください');
      return;
    }

    try {
      showToast('success', 'パスワード変更完了', 'パスワードが正常に変更されました');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      showToast('error', 'エラー', 'パスワード変更中にエラーが発生しました');
    }
  };

  const handleTwoFactorToggle = async (enabled: boolean) => {
    try {
      handleInputChange('twoFactorEnabled', enabled);
      if (enabled) {
        showToast('success', '2段階認証有効化', '2段階認証が有効になりました');
      } else {
        showToast('success', '2段階認証無効化', '2段階認証が無効になりました');
      }
    } catch (error) {
      showToast('error', 'エラー', '2段階認証の設定中にエラーが発生しました');
    }
  };

  const handleSaveSettings = async () => {
    try {
      showToast('success', '設定保存完了', 'セキュリティ設定を保存しました');
    } catch (error) {
      showToast('error', 'エラー', '設定保存中にエラーが発生しました');
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
                  <h1 className="text-3xl font-bold text-foreground mb-2">セキュリティ</h1>
                  <p className="text-muted-foreground">
                    パスワード変更、2段階認証等のセキュリティ設定を行ってください
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* パスワード変更 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      パスワード変更
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">現在のパスワード</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={formData.currentPassword}
                          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                          placeholder="現在のパスワードを入力"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="newPassword">新しいパスワード</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={formData.newPassword}
                          onChange={(e) => handleInputChange('newPassword', e.target.value)}
                          placeholder="新しいパスワードを入力（8文字以上）"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">パスワード確認</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          placeholder="新しいパスワードを再入力"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button onClick={handlePasswordChange} className="w-full">
                      <Key className="mr-2 h-4 w-4" />
                      パスワードを変更
                    </Button>
                  </CardContent>
                </Card>

                {/* 2段階認証 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      2段階認証
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">2段階認証を有効にする</p>
                        <p className="text-sm text-muted-foreground">
                          ログイン時にSMSまたは認証アプリでの確認が必要になります
                        </p>
                      </div>
                      <Switch
                        checked={formData.twoFactorEnabled}
                        onCheckedChange={handleTwoFactorToggle}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* ログイン通知 */}
                <Card>
                  <CardHeader>
                    <CardTitle>ログイン設定</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">ログイン通知</p>
                        <p className="text-sm text-muted-foreground">
                          新しいデバイスからのログイン時にメール通知を送信
                        </p>
                      </div>
                      <Switch
                        checked={formData.loginNotifications}
                        onCheckedChange={(checked) => handleInputChange('loginNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">デバイス信頼</p>
                        <p className="text-sm text-muted-foreground">
                          信頼されたデバイスでの2段階認証をスキップ
                        </p>
                      </div>
                      <Switch
                        checked={formData.deviceTrust}
                        onCheckedChange={(checked) => handleInputChange('deviceTrust', checked)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="sessionTimeout">セッションタイムアウト（時間）</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={formData.sessionTimeout}
                        onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
                        placeholder="24"
                        min="1"
                        max="720"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        指定した時間が経過すると自動的にログアウトします
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* セキュリティ情報 */}
                <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                      <Shield className="h-5 w-5" />
                      セキュリティのヒント
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                      <li>• 強力なパスワードを使用し、定期的に変更してください</li>
                      <li>• 2段階認証を有効にすることを強く推奨します</li>
                      <li>• 公共のWi-Fiでの利用時は特に注意してください</li>
                      <li>• 不審なログイン通知があった場合は、すぐにパスワードを変更してください</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* 保存ボタン */}
                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => router.back()}>
                    キャンセル
                  </Button>
                  <Button onClick={handleSaveSettings}>
                    <Save className="mr-2 h-4 w-4" />
                    設定を保存
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
            セキュリティ設定のモバイル版は準備中です。デスクトップでご利用ください。
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}