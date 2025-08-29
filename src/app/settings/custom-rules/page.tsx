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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  Lightbulb
} from 'lucide-react';

interface CustomRule {
  id: number;
  keyword: string;
  category: string;
  isBusiness: boolean;
  enabled: boolean;
}

export default function CustomRulesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  // カスタム分類ルール（LocalStorageから初期化）
  const [customRules, setCustomRules] = useState<CustomRule[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('customClassificationRules');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed;
        }
      } catch (error) {
        console.error('LocalStorageのカスタムルール読み込みエラー:', error);
        localStorage.removeItem('customClassificationRules');
      }
    }
    // デフォルトルール
    return [
      { id: 1, keyword: 'スターバックス', category: '会議費', isBusiness: true, enabled: true },
      { id: 2, keyword: 'セブンイレブン', category: '食費', isBusiness: false, enabled: true },
      { id: 3, keyword: 'エネオス', category: '旅費交通費', isBusiness: true, enabled: true },
    ];
  });
  
  const [newRule, setNewRule] = useState({
    keyword: '',
    category: '食費',
    isBusiness: false
  });

  // 利用可能なカテゴリー
  const CATEGORIES = {
    business: [
      { id: 'cat-103', name: '広告宣伝費' },
      { id: 'cat-104', name: '旅費交通費' },
      { id: 'cat-105', name: '通信費' },
      { id: 'cat-106', name: '消耗品費' },
      { id: 'cat-107', name: '会議費' },
      { id: 'cat-108', name: '研修費' },
      { id: 'cat-109', name: '支払手数料' },
      { id: 'cat-110', name: '地代家賃' },
      { id: 'cat-111', name: '水道光熱費' },
      { id: 'cat-112', name: '修繕費' },
      { id: 'cat-113', name: '租税公課' },
      { id: 'cat-114', name: '雑費' },
    ],
    personal: [
      { id: 'cat-201', name: '食費' },
      { id: 'cat-202', name: '交通費' },
      { id: 'cat-203', name: '日用品' },
      { id: 'cat-204', name: '医療費' },
      { id: 'cat-205', name: '娯楽費' },
      { id: 'cat-206', name: '衣服費' },
      { id: 'cat-207', name: '雑費' },
    ]
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  // ルールをLocalStorageに保存
  const saveRules = () => {
    try {
      localStorage.setItem('customClassificationRules', JSON.stringify(customRules));
      showToast('success', '保存完了', 'カスタムルールが保存されました');
    } catch (error) {
      console.error('LocalStorageへの保存エラー:', error);
      showToast('error', '保存エラー', '保存中にエラーが発生しました');
    }
  };

  // 新しいルールを追加
  const addRule = () => {
    if (!newRule.keyword.trim()) {
      showToast('error', 'エラー', 'キーワードを入力してください');
      return;
    }

    const nextId = Math.max(...customRules.map(r => r.id), 0) + 1;
    const rule: CustomRule = {
      id: nextId,
      keyword: newRule.keyword.trim(),
      category: newRule.category,
      isBusiness: newRule.isBusiness,
      enabled: true
    };

    setCustomRules(prev => [...prev, rule]);
    setNewRule({ keyword: '', category: '食費', isBusiness: false });
  };

  // ルールを削除
  const deleteRule = (id: number) => {
    setCustomRules(prev => prev.filter(rule => rule.id !== id));
  };

  // ルールの有効/無効を切り替え
  const toggleRule = (id: number) => {
    setCustomRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
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
      
      {/* デスクトップレイアウト */}
      <div className="hidden md:flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <main className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      設定に戻る
                    </Button>
                  </div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">カスタム分類ルール</h1>
                  <p className="text-muted-foreground">
                    特定のキーワードに対する自動分類ルールを設定してください
                  </p>
                </div>
                <Button onClick={saveRules}>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </Button>
              </div>

              {/* 新しいルール追加 */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    新しいルール追加
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyword">キーワード</Label>
                      <Input
                        id="keyword"
                        placeholder="例: スターバックス"
                        value={newRule.keyword}
                        onChange={(e) => setNewRule(prev => ({ ...prev, keyword: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">カテゴリ</Label>
                      <Select 
                        value={newRule.category} 
                        onValueChange={(value) => setNewRule(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <optgroup label="事業用">
                            {CATEGORIES.business.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </optgroup>
                          <optgroup label="個人用">
                            {CATEGORIES.personal.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </optgroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business-type">事業/個人</Label>
                      <Select 
                        value={newRule.isBusiness ? 'business' : 'personal'} 
                        onValueChange={(value) => setNewRule(prev => ({ ...prev, isBusiness: value === 'business' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business">事業用</SelectItem>
                          <SelectItem value="personal">個人用</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button onClick={addRule} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        追加
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 既存ルール一覧 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    設定済みルール ({customRules.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customRules.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>カスタムルールがありません</p>
                        <p className="text-sm">上記のフォームから新しいルールを追加してください</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customRules.map((rule) => (
                          <div 
                            key={rule.id} 
                            className={`flex items-center justify-between p-4 rounded-lg border transition-opacity ${
                              rule.enabled ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{rule.keyword}</span>
                                  {!rule.enabled && (
                                    <Badge variant="secondary" className="text-xs">
                                      無効
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Badge 
                                    variant={rule.isBusiness ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {rule.isBusiness ? '事業用' : '個人用'}
                                  </Badge>
                                  <span>→</span>
                                  <span>{rule.category}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleRule(rule.id)}
                              >
                                {rule.enabled ? (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 使用方法の説明 */}
              <Card className="mt-8 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                    <Lightbulb className="h-5 w-5" />
                    カスタムルールの使い方
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      💡 <strong>キーワードマッチング</strong>: 取引の説明文や店舗名にキーワードが含まれている場合、自動的に指定されたカテゴリに分類されます。
                    </p>
                    <p>
                      🔍 <strong>部分一致</strong>: 「スターバックス」と設定すると「スターバックス新宿店」なども対象になります。
                    </p>
                    <p>
                      ⚡ <strong>優先度</strong>: カスタムルールは他の自動分類より優先されます。
                    </p>
                    <p>
                      👁️ <strong>一時無効</strong>: 目のアイコンでルールを一時的に無効化できます（削除せずに済みます）。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* モバイルレイアウト */}
      <div className="md:hidden pb-16">
        <main className="p-4">
          <div className="text-center text-muted-foreground">
            カスタムルール設定のモバイル版は準備中です。デスクトップでご利用ください。
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}