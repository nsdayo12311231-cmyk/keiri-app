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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Bell, Save, ArrowLeft, Mail, Smartphone, Calendar, DollarSign, FileText } from 'lucide-react';

export default function NotificationsSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    // メール通知
    emailNotifications: true,
    transactionAlerts: true,
    monthlyReports: true,
    taxReminders: true,
    systemUpdates: false,
    
    // プッシュ通知
    pushNotifications: true,
    instantAlerts: true,
    dailySummary: true,
    weeklyReports: false,
    
    // 通知タイミング
    dailySummaryTime: '09:00',
    monthlyReportDay: '1',
    taxReminderDays: '30'
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
      showToast('success', '設定保存完了', '通知設定を保存しました');
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
                  <h1 className="text-3xl font-bold text-foreground mb-2">通知設定</h1>
                  <p className="text-muted-foreground">
                    メール通知、プッシュ通知の設定を行ってください
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* メール通知設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      メール通知
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">メール通知を有効にする</p>
                        <p className="text-sm text-muted-foreground">
                          すべてのメール通知の有効/無効を制御します
                        </p>
                      </div>
                      <Switch
                        checked={formData.emailNotifications}
                        onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                      />
                    </div>

                    {formData.emailNotifications && (
                      <div className="space-y-4 pl-4 border-l-2 border-muted">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <p className="font-medium">取引アラート</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              新しい取引が記録された際の通知
                            </p>
                          </div>
                          <Switch
                            checked={formData.transactionAlerts}
                            onCheckedChange={(checked) => handleInputChange('transactionAlerts', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <p className="font-medium">月次レポート</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              毎月の経費サマリーレポート
                            </p>
                          </div>
                          <Switch
                            checked={formData.monthlyReports}
                            onCheckedChange={(checked) => handleInputChange('monthlyReports', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <p className="font-medium">税務リマインダー</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              確定申告期限等の税務関連リマインダー
                            </p>
                          </div>
                          <Switch
                            checked={formData.taxReminders}
                            onCheckedChange={(checked) => handleInputChange('taxReminders', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              <p className="font-medium">システム更新情報</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              新機能やメンテナンス情報の通知
                            </p>
                          </div>
                          <Switch
                            checked={formData.systemUpdates}
                            onCheckedChange={(checked) => handleInputChange('systemUpdates', checked)}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* プッシュ通知設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      プッシュ通知
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">プッシュ通知を有効にする</p>
                        <p className="text-sm text-muted-foreground">
                          ブラウザ通知やモバイルプッシュ通知を受信します
                        </p>
                      </div>
                      <Switch
                        checked={formData.pushNotifications}
                        onCheckedChange={(checked) => handleInputChange('pushNotifications', checked)}
                      />
                    </div>

                    {formData.pushNotifications && (
                      <div className="space-y-4 pl-4 border-l-2 border-muted">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">即時アラート</p>
                            <p className="text-sm text-muted-foreground">
                              重要な取引や異常な支出の即時通知
                            </p>
                          </div>
                          <Switch
                            checked={formData.instantAlerts}
                            onCheckedChange={(checked) => handleInputChange('instantAlerts', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">日次サマリー</p>
                            <p className="text-sm text-muted-foreground">
                              1日の支出サマリー通知
                            </p>
                          </div>
                          <Switch
                            checked={formData.dailySummary}
                            onCheckedChange={(checked) => handleInputChange('dailySummary', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">週次レポート</p>
                            <p className="text-sm text-muted-foreground">
                              週単位の経費レポート通知
                            </p>
                          </div>
                          <Switch
                            checked={formData.weeklyReports}
                            onCheckedChange={(checked) => handleInputChange('weeklyReports', checked)}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 通知タイミング設定 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      通知タイミング
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dailySummaryTime">日次サマリー通知時刻</Label>
                        <Select onValueChange={(value) => handleInputChange('dailySummaryTime', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="時刻を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="07:00">07:00</SelectItem>
                            <SelectItem value="08:00">08:00</SelectItem>
                            <SelectItem value="09:00">09:00</SelectItem>
                            <SelectItem value="10:00">10:00</SelectItem>
                            <SelectItem value="18:00">18:00</SelectItem>
                            <SelectItem value="19:00">19:00</SelectItem>
                            <SelectItem value="20:00">20:00</SelectItem>
                            <SelectItem value="21:00">21:00</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="monthlyReportDay">月次レポート送信日</Label>
                        <Select onValueChange={(value) => handleInputChange('monthlyReportDay', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="日を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1日</SelectItem>
                            <SelectItem value="5">5日</SelectItem>
                            <SelectItem value="10">10日</SelectItem>
                            <SelectItem value="15">15日</SelectItem>
                            <SelectItem value="20">20日</SelectItem>
                            <SelectItem value="25">25日</SelectItem>
                            <SelectItem value="28">28日</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="taxReminderDays">税務リマインダー（期限前日数）</Label>
                        <Select onValueChange={(value) => handleInputChange('taxReminderDays', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="日数を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7日前</SelectItem>
                            <SelectItem value="14">14日前</SelectItem>
                            <SelectItem value="30">30日前</SelectItem>
                            <SelectItem value="60">60日前</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 通知プレビュー */}
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Bell className="h-5 w-5" />
                      通知プレビュー
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        現在の設定でどのような通知が送信されるかのプレビューです：
                      </p>
                      <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                        {formData.emailNotifications && formData.transactionAlerts && (
                          <div>✉️ 取引記録時：即座にメール通知</div>
                        )}
                        {formData.pushNotifications && formData.dailySummary && (
                          <div>📱 日次サマリー：{formData.dailySummaryTime}にプッシュ通知</div>
                        )}
                        {formData.emailNotifications && formData.monthlyReports && (
                          <div>📊 月次レポート：毎月{formData.monthlyReportDay}日にメール送信</div>
                        )}
                        {formData.emailNotifications && formData.taxReminders && (
                          <div>📅 税務リマインダー：期限{formData.taxReminderDays}日前にメール通知</div>
                        )}
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
            通知設定のモバイル版は準備中です。デスクトップでご利用ください。
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}