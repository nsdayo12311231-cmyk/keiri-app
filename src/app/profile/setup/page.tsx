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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { 
  User, 
  Building2, 
  MapPin, 
  Calculator,
  Settings,
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import {
  type DetailedBusinessType,
  type MajorIndustryCategory,
  type WorkLocationType,
  type ClientRelationshipType,
  type IncomeStabilityType,
  type TaxFilingType,
  SUB_INDUSTRY_OPTIONS,
  PREFECTURES
} from '@/lib/types/user-profile.types';

interface ProfileSetupData {
  // 基本事業情報
  detailed_business_type: DetailedBusinessType | '';
  major_industry_category: MajorIndustryCategory | '';
  sub_industry_category: string;
  specializations: string[];
  
  // 働き方・運営形態
  work_location_type: WorkLocationType | '';
  client_relationship_type: ClientRelationshipType | '';
  income_stability_type: IncomeStabilityType | '';
  
  // 事業規模・体制
  has_employees: boolean;
  employee_count: number;
  uses_outsourcing: boolean;
  
  // 事業開始・所在地情報
  business_start_date: string;
  prefecture: string;
  
  // 税務情報
  tax_filing_type: TaxFilingType | '';
  is_taxable_entity: boolean;
}

const BUSINESS_TYPE_OPTIONS = [
  { value: 'sole_proprietor', label: '個人事業主（開業届提出済み）' },
  { value: 'sole_proprietor_preparing', label: '個人事業主（開業準備中）' },
  { value: 'freelancer', label: 'フリーランス（開業届未提出）' },
  { value: 'side_business', label: '副業（給与所得者の副業）' },
  { value: 'small_corporation', label: '小規模法人（役員）' },
  { value: 'corporation_employee', label: '法人従業員（経費精算用）' },
];

const INDUSTRY_OPTIONS = [
  { value: 'it_tech', label: 'IT・技術' },
  { value: 'creative_media', label: 'クリエイティブ・メディア' },
  { value: 'consulting_business', label: 'コンサルティング・ビジネス' },
  { value: 'healthcare_welfare', label: '医療・福祉' },
  { value: 'education_culture', label: '教育・文化' },
  { value: 'construction_real_estate', label: '建設・不動産' },
  { value: 'retail_commerce', label: '小売・商業' },
  { value: 'food_service', label: '飲食・サービス' },
  { value: 'transportation_logistics', label: '運送・物流' },
  { value: 'manufacturing', label: '製造業' },
  { value: 'finance_insurance', label: '金融・保険' },
  { value: 'agriculture_fishery', label: '農業・漁業' },
  { value: 'other_services', label: 'その他サービス業' },
];

const WORK_LOCATION_OPTIONS = [
  { value: 'home_office', label: '自宅オフィス' },
  { value: 'coworking_space', label: 'コワーキングスペース' },
  { value: 'client_office', label: '客先常駐' },
  { value: 'rental_office', label: '賃貸オフィス' },
  { value: 'mobile_work', label: '移動が多い' },
  { value: 'retail_store', label: '実店舗経営' },
  { value: 'workshop_factory', label: '工房・工場' },
];

const CLIENT_RELATIONSHIP_OPTIONS = [
  { value: 'b2b_enterprise', label: '法人向け（大企業）' },
  { value: 'b2b_sme', label: '法人向け（中小企業）' },
  { value: 'b2c_individual', label: '個人顧客向け' },
  { value: 'b2b2c_platform', label: 'プラットフォーム経由' },
  { value: 'mixed', label: '混合' },
];

const INCOME_STABILITY_OPTIONS = [
  { value: 'fixed_contract', label: '固定契約（安定収入）' },
  { value: 'project_based', label: 'プロジェクトベース' },
  { value: 'commission_based', label: '成果報酬' },
  { value: 'seasonal', label: '季節性あり' },
  { value: 'irregular', label: '不規則' },
];

const TAX_FILING_OPTIONS = [
  { value: 'blue', label: '青色申告' },
  { value: 'white', label: '白色申告' },
  { value: 'not_decided', label: 'まだ決めていない' },
];

export default function ProfileSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProfileSetupData>({
    detailed_business_type: '',
    major_industry_category: '',
    sub_industry_category: '',
    specializations: [],
    work_location_type: '',
    client_relationship_type: '',
    income_stability_type: '',
    has_employees: false,
    employee_count: 0,
    uses_outsourcing: false,
    business_start_date: '',
    prefecture: '',
    tax_filing_type: '',
    is_taxable_entity: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  const updateFormData = (field: keyof ProfileSetupData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecializationToggle = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // ユーザー詳細プロフィールを保存
      const { error: profileError } = await supabase
        .from('user_detailed_profiles')
        .upsert({
          user_id: user.id,
          ...formData
        });

      if (profileError) throw profileError;

      showToast('success', 'プロフィール設定完了', 'プロフィールが正常に保存されました');
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Profile setup error:', error);
      showToast('error', 'エラー', 'プロフィール設定中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
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

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          基本的な事業情報
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="business-type">事業形態</Label>
          <Select 
            value={formData.detailed_business_type} 
            onValueChange={(value: DetailedBusinessType) => updateFormData('detailed_business_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="事業形態を選択してください" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">業種（大分類）</Label>
          <Select 
            value={formData.major_industry_category} 
            onValueChange={(value: MajorIndustryCategory) => {
              updateFormData('major_industry_category', value);
              updateFormData('sub_industry_category', '');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="業種を選択してください" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.major_industry_category && (
          <div className="space-y-2">
            <Label htmlFor="sub-industry">業種（詳細）</Label>
            <Select 
              value={formData.sub_industry_category} 
              onValueChange={(value) => updateFormData('sub_industry_category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="詳細な業種を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {SUB_INDUSTRY_OPTIONS[formData.major_industry_category].map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>専門分野・スキル（複数選択可）</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {formData.major_industry_category && SUB_INDUSTRY_OPTIONS[formData.major_industry_category].map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox 
                  id={option.value}
                  checked={formData.specializations.includes(option.value)}
                  onCheckedChange={() => handleSpecializationToggle(option.value)}
                />
                <Label htmlFor={option.value} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          働き方・事業運営
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="work-location">主な働く場所</Label>
          <Select 
            value={formData.work_location_type} 
            onValueChange={(value: WorkLocationType) => updateFormData('work_location_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="働く場所を選択してください" />
            </SelectTrigger>
            <SelectContent>
              {WORK_LOCATION_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-relationship">主な取引先</Label>
          <Select 
            value={formData.client_relationship_type} 
            onValueChange={(value: ClientRelationshipType) => updateFormData('client_relationship_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="取引先のタイプを選択してください" />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_RELATIONSHIP_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="income-stability">収入の安定性</Label>
          <Select 
            value={formData.income_stability_type} 
            onValueChange={(value: IncomeStabilityType) => updateFormData('income_stability_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="収入パターンを選択してください" />
            </SelectTrigger>
            <SelectContent>
              {INCOME_STABILITY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="has-employees"
              checked={formData.has_employees}
              onCheckedChange={(checked) => updateFormData('has_employees', checked)}
            />
            <Label htmlFor="has-employees">従業員がいる</Label>
          </div>

          {formData.has_employees && (
            <div className="space-y-2">
              <Label htmlFor="employee-count">従業員数</Label>
              <Input
                id="employee-count"
                type="number"
                min="1"
                value={formData.employee_count}
                onChange={(e) => updateFormData('employee_count', parseInt(e.target.value) || 0)}
                placeholder="従業員数を入力"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="uses-outsourcing"
              checked={formData.uses_outsourcing}
              onCheckedChange={(checked) => updateFormData('uses_outsourcing', checked)}
            />
            <Label htmlFor="uses-outsourcing">外注・業務委託を利用している</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          事業開始・所在地情報
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="business-start-date">事業開始日</Label>
          <Input
            id="business-start-date"
            type="date"
            value={formData.business_start_date}
            onChange={(e) => updateFormData('business_start_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prefecture">都道府県</Label>
          <Select 
            value={formData.prefecture} 
            onValueChange={(value) => updateFormData('prefecture', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="都道府県を選択してください" />
            </SelectTrigger>
            <SelectContent>
              {PREFECTURES.map(prefecture => (
                <SelectItem key={prefecture} value={prefecture}>
                  {prefecture}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          税務・申告情報
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tax-filing-type">申告方法</Label>
          <Select 
            value={formData.tax_filing_type} 
            onValueChange={(value: TaxFilingType) => updateFormData('tax_filing_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="申告方法を選択してください" />
            </SelectTrigger>
            <SelectContent>
              {TAX_FILING_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="is-taxable-entity"
            checked={formData.is_taxable_entity}
            onCheckedChange={(checked) => updateFormData('is_taxable_entity', checked)}
          />
          <Label htmlFor="is-taxable-entity">消費税課税事業者</Label>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ℹ️ この情報は経費の自動分類精度向上に使用されます。
            設定はいつでも変更可能です。
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const totalSteps = 4;
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.detailed_business_type && formData.major_industry_category;
      case 2:
        return formData.work_location_type && formData.client_relationship_type && formData.income_stability_type;
      case 3:
        return formData.prefecture;
      case 4:
        return formData.tax_filing_type;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">プロフィール設定</h1>
              <span className="text-sm text-muted-foreground">
                {currentStep} / {totalSteps}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="mb-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>

            {currentStep < totalSteps ? (
              <Button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
              >
                次へ
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    設定完了
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}