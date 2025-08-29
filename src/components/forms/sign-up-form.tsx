'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Calculator, AlertCircle, CheckCircle, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';
import type { MajorIndustryCategory } from '@/lib/types/user-profile.types';

interface SignUpData {
  // 必須情報
  email: string;
  password: string;
  fullName: string;
  businessType: 'individual' | 'freelancer' | 'small_business' | 'corporation' | '';
  majorIndustry: MajorIndustryCategory | '';
  
}

const BUSINESS_TYPE_OPTIONS = [
  { value: 'individual', label: '個人事業主', description: '開業届を提出している' },
  { value: 'freelancer', label: 'フリーランス', description: '開業届未提出、副業含む' },
  { value: 'small_business', label: '小規模事業者', description: '従業員数名の事業' },
  { value: 'corporation', label: '法人', description: '株式会社等の法人' },
];

const INDUSTRY_OPTIONS = [
  { value: 'it_tech', label: 'IT・技術', description: 'エンジニア、プログラマー、デザイナー等' },
  { value: 'creative_media', label: 'クリエイティブ・メディア', description: 'デザイナー、カメラマン、ライター等' },
  { value: 'consulting_business', label: 'コンサルティング・ビジネス', description: 'コンサルタント、営業、マーケティング等' },
  { value: 'healthcare_welfare', label: '医療・福祉', description: '医師、看護師、介護士等' },
  { value: 'education_culture', label: '教育・文化', description: '講師、教師、研究者等' },
  { value: 'construction_real_estate', label: '建設・不動産', description: '建築士、工事業、不動産業等' },
  { value: 'retail_commerce', label: '小売・商業', description: 'ECショップ、小売店等' },
  { value: 'food_service', label: '飲食・サービス', description: 'レストラン、カフェ、サービス業等' },
  { value: 'transportation_logistics', label: '運送・物流', description: '配送、運送、物流等' },
  { value: 'manufacturing', label: '製造業', description: '工場、工芸、製造等' },
  { value: 'finance_insurance', label: '金融・保険', description: 'ファイナンシャルプランナー、保険代理店等' },
  { value: 'agriculture_fishery', label: '農業・漁業', description: '農業、漁業、畜産等' },
  { value: 'other_services', label: 'その他サービス業', description: '美容、クリーニング、修理等' },
];

export function SignUpForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');
  const [isClient, setIsClient] = useState(false);
  
  const [formData, setFormData] = useState<SignUpData>({
    email: '',
    password: '',
    fullName: '',
    businessType: '',
    majorIndustry: '',
  });

  const { signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateFormData = (field: keyof SignUpData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceedStep1 = () => {
    return formData.email && formData.password && formData.fullName && 
           formData.password.length >= 6;
  };

  const canProceedStep2 = () => {
    return formData.businessType && formData.majorIndustry;
  };

  const handleSubmit = async (skipOptional = false) => {
    setIsLoading(true);
    setMessage('');

    if (!canProceedStep1() || !canProceedStep2()) {
      setMessage('必須項目を入力してください');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    try {
      // 1. アカウント作成
      const { data: authData, error: authError } = await signUp(
        formData.email, 
        formData.password, 
        formData.fullName
      );

      if (authError) {
        setMessage(authError.message);
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      // 2. プロフィール情報を保存
      if (authData.user) {
        // 基本プロフィール
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            business_type: formData.businessType,
            tax_year: new Date().getFullYear(),
          });

        if (profileError) {
          console.error('Profile save error:', profileError);
        }

        // 詳細プロフィール
        const { error: detailedProfileError } = await supabase
          .from('user_detailed_profiles')
          .insert({
            user_id: authData.user.id,
            detailed_business_type: formData.businessType,
            major_industry_category: formData.majorIndustry,
          });

        if (detailedProfileError) {
          console.error('Detailed profile save error:', detailedProfileError);
        }

        // 経費設定（オプション）
        if (!skipOptional && (formData.parkingDefault || formData.energyDrinkPolicy)) {
          const { error: preferencesError } = await supabase
            .from('user_expense_preferences')
            .insert({
              user_id: authData.user.id,
              parking_default: formData.parkingDefault || 'personal',
              energy_drink_policy: formData.energyDrinkPolicy || 'personal',
            });

          if (preferencesError) {
            console.error('Preferences save error:', preferencesError);
          }
        }
      }

      if (authData.user && !authData.session) {
        setMessage('確認メールを送信しました。メールボックスをご確認ください。');
        setMessageType('success');
      } else if (authData.session) {
        setMessage('アカウントが作成されました');
        setMessageType('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage('予期しないエラーが発生しました');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">
          お名前 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="山田 太郎"
          value={formData.fullName}
          onChange={(e) => updateFormData('fullName', e.target.value)}
          disabled={isLoading}
          required
        />
        <p className="text-xs text-muted-foreground">
          申告書等で使用されます
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">
          メールアドレス <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="example@domain.com"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">
          パスワード <span className="text-destructive">*</span>
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="6文字以上で入力"
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessType">
          事業形態 <span className="text-destructive">*</span>
        </Label>
        <Select 
          value={formData.businessType} 
          onValueChange={(value) => updateFormData('businessType', value)}
        >
          <SelectTrigger className="h-auto py-3">
            <SelectValue placeholder="事業形態を選択してください" />
          </SelectTrigger>
          <SelectContent className="max-h-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {BUSINESS_TYPE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value} className="py-3 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700">
                <div className="flex flex-col items-start gap-1">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{option.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{option.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="majorIndustry">
          業種 <span className="text-destructive">*</span>
        </Label>
        <Select 
          value={formData.majorIndustry} 
          onValueChange={(value) => updateFormData('majorIndustry', value)}
        >
          <SelectTrigger className="h-auto py-3">
            <SelectValue placeholder="業種を選択してください" />
          </SelectTrigger>
          <SelectContent className="max-h-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {INDUSTRY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value} className="py-3 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700">
                <div className="flex flex-col items-start gap-1">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{option.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{option.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          より正確な経費自動分類のために使用されます
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
        <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 mb-2">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">アカウント作成準備完了</span>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300 mb-3">
          基本情報の入力が完了しました。<br/>
          すぐにアカウントを作成して経理を始めましょう！
        </p>
        <p className="text-xs text-green-600 dark:text-green-400">
          詳細設定はアカウント作成後に設定ページから行えます。
        </p>
      </div>
    </div>
  );

  const totalSteps = 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Calculator className="h-12 w-12 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">アカウント作成</CardTitle>
            <CardDescription className="mt-2">
              {currentStep === 1 && 'アカウント情報を入力してください'}
              {currentStep === 2 && '事業情報を教えてください'}
              {currentStep === 3 && '最終確認'}
            </CardDescription>
          </div>
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index + 1 <= currentStep ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {message && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-md mt-4 ${
                messageType === 'error' 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-300'
              }`}>
                {messageType === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>{message}</span>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {currentStep > 1 ? (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  戻る
                </Button>
              ) : (
                <div></div>
              )}

              {currentStep < totalSteps ? (
                <Button 
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={
                    isLoading || 
                    (currentStep === 1 && !canProceedStep1()) ||
                    (currentStep === 2 && !canProceedStep2())
                  }
                >
                  次へ
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? '作成中...' : 'アカウント作成'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            すでにアカウントをお持ちですか？{' '}
            <Link href="/auth/signin" className="text-primary hover:underline">
              ログイン
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}