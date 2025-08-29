'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { Palette, Save, ArrowLeft, Sun, Moon, Monitor, Globe, Eye } from 'lucide-react';

export default function AppearanceSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    theme: 'system',
    language: 'ja',
    currency: 'JPY',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h',
    compactMode: false,
    highContrast: false,
    reduceMotion: false,
    showAnimations: true,
    dashboardLayout: 'default'
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
      showToast('success', '設定保存完了', '表示設定を保存しました');
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
                  <h1 className="text-3xl font-bold text-foreground mb-2">表示設定</h1>
                  <p className="text-muted-foreground">
                    テーマ、言語、表示形式の設定を行ってください
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* テーマ設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      テーマ設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="theme">テーマ</Label>
                      <Select onValueChange={(value) => handleInputChange('theme', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="テーマを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2">
                              <Sun className="h-4 w-4" />
                              ライトモード
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4" />
                              ダークモード
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4" />
                              システム設定に従う
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        システム設定に従うと、端末の設定に応じて自動的にテーマが切り替わります
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">ハイコントラスト</p>
                        <p className="text-sm text-muted-foreground">
                          視認性を向上させるため、コントラストを強調します
                        </p>
                      </div>
                      <Switch
                        checked={formData.highContrast}
                        onCheckedChange={(checked) => handleInputChange('highContrast', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 言語・地域設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      言語・地域設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="language">言語</Label>
                      <Select onValueChange={(value) => handleInputChange('language', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="言語を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="currency">通貨</Label>
                      <Select onValueChange={(value) => handleInputChange('currency', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="通貨を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="JPY">日本円 (¥)</SelectItem>
                          <SelectItem value="USD">米ドル ($)</SelectItem>
                          <SelectItem value="EUR">ユーロ (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dateFormat">日付形式</Label>
                        <Select onValueChange={(value) => handleInputChange('dateFormat', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="日付形式を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="YYYY/MM/DD">2024/03/15</SelectItem>
                            <SelectItem value="MM/DD/YYYY">03/15/2024</SelectItem>
                            <SelectItem value="DD/MM/YYYY">15/03/2024</SelectItem>
                            <SelectItem value="YYYY-MM-DD">2024-03-15</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="timeFormat">時刻形式</Label>
                        <Select onValueChange={(value) => handleInputChange('timeFormat', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="時刻形式を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24h">24時間 (14:30)</SelectItem>
                            <SelectItem value="12h">12時間 (2:30 PM)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 表示オプション */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      表示オプション
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="dashboardLayout">ダッシュボードレイアウト</Label>
                      <Select onValueChange={(value) => handleInputChange('dashboardLayout', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="レイアウトを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">デフォルト</SelectItem>
                          <SelectItem value="compact">コンパクト</SelectItem>
                          <SelectItem value="detailed">詳細表示</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">コンパクトモード</p>
                        <p className="text-sm text-muted-foreground">
                          画面を有効活用するため、要素間の余白を狭くします
                        </p>
                      </div>
                      <Switch
                        checked={formData.compactMode}
                        onCheckedChange={(checked) => handleInputChange('compactMode', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">アニメーション表示</p>
                        <p className="text-sm text-muted-foreground">
                          ページ遷移やボタン操作時のアニメーション効果
                        </p>
                      </div>
                      <Switch
                        checked={formData.showAnimations}
                        onCheckedChange={(checked) => handleInputChange('showAnimations', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">モーション軽減</p>
                        <p className="text-sm text-muted-foreground">
                          視覚的な動きを最小限に抑えます（アクセシビリティ対応）
                        </p>
                      </div>
                      <Switch
                        checked={formData.reduceMotion}
                        onCheckedChange={(checked) => handleInputChange('reduceMotion', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* プレビューセクション */}
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Eye className="h-5 w-5" />
                      設定プレビュー
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-green-700 dark:text-green-300">
                        <p><strong>現在の設定:</strong></p>
                        <ul className="mt-2 space-y-1">
                          <li>• テーマ: {
                            formData.theme === 'light' ? 'ライトモード' :
                            formData.theme === 'dark' ? 'ダークモード' : 'システム設定に従う'
                          }</li>
                          <li>• 言語: {formData.language === 'ja' ? '日本語' : 'English'}</li>
                          <li>• 通貨: {formData.currency}</li>
                          <li>• 日付形式: {formData.dateFormat}</li>
                          <li>• 時刻形式: {formData.timeFormat === '24h' ? '24時間' : '12時間'}</li>
                        </ul>
                      </div>
                      <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border">
                        <p className="text-sm font-medium">表示例:</p>
                        <p className="text-lg font-bold text-primary">¥123,456</p>
                        <p className="text-sm text-muted-foreground">
                          2024年3月15日 14:30 | 交通費
                        </p>
                      </div>
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
            表示設定のモバイル版は準備中です。デスクトップでご利用ください。
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}