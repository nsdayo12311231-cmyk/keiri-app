/**
 * 日本の税務計算ユーティリティ
 * 所得税、住民税、事業税、消費税の計算機能を提供
 */

// 2024年度の税率設定
export const TAX_RATES = {
  // 所得税率（累進課税）
  INCOME_TAX_BRACKETS: [
    { min: 0, max: 1950000, rate: 0.05 },          // 5%
    { min: 1950000, max: 3300000, rate: 0.10 },    // 10%
    { min: 3300000, max: 6950000, rate: 0.20 },    // 20%
    { min: 6950000, max: 9000000, rate: 0.23 },    // 23%
    { min: 9000000, max: 18000000, rate: 0.33 },   // 33%
    { min: 18000000, max: 40000000, rate: 0.40 },  // 40%
    { min: 40000000, max: Infinity, rate: 0.45 }   // 45%
  ],
  
  // 住民税率（一律）
  RESIDENCE_TAX_RATE: 0.10, // 10% (所得割)
  RESIDENCE_TAX_EQUAL: 5000, // 均等割 5,000円
  
  // 事業税率（個人事業主）
  BUSINESS_TAX_RATE: 0.05, // 5%
  BUSINESS_TAX_DEDUCTION: 2900000, // 基礎控除290万円
  
  // 消費税率
  CONSUMPTION_TAX_RATE: 0.10, // 10%
  REDUCED_TAX_RATE: 0.08, // 軽減税率8%
  
  // 基礎控除等
  BASIC_DEDUCTION: 480000, // 基礎控除48万円
  BLUE_FORM_DEDUCTION: 650000 // 青色申告特別控除65万円
};

export interface TaxCalculationInput {
  // 収入
  totalRevenue: number;
  
  // 必要経費
  businessExpenses: number;
  
  // 控除
  basicDeduction?: number;
  blueFormDeduction?: number;
  socialInsurance?: number; // 社会保険料控除
  lifeInsurance?: number;   // 生命保険料控除
  earthquakeInsurance?: number; // 地震保険料控除
  medicalExpenses?: number; // 医療費控除
  
  // その他設定
  isBlueForm?: boolean; // 青色申告かどうか
  prefecture?: string;  // 都道府県（事業税率調整用）
}

export interface TaxCalculationResult {
  // 所得計算
  totalIncome: number;      // 総所得金額
  taxableIncome: number;    // 課税所得金額
  
  // 税額計算
  incomeTax: number;        // 所得税額
  residenceTax: number;     // 住民税額
  businessTax: number;      // 事業税額
  consumptionTax: number;   // 消費税額（簡易計算）
  
  // 合計
  totalTax: number;         // 総税額
  netIncome: number;        // 手取り収入
  
  // 詳細情報
  breakdown: {
    deductions: {
      basic: number;
      blueForm: number;
      socialInsurance: number;
      other: number;
      total: number;
    };
    taxDetails: {
      incomeTaxBreakdown: Array<{ bracket: string; amount: number; tax: number }>;
      effectiveTaxRate: number;
    };
  };
}

/**
 * 総合的な税務計算
 */
export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  // 所得計算
  const totalIncome = Math.max(0, input.totalRevenue - input.businessExpenses);
  
  // 控除計算
  const basicDeduction = input.basicDeduction || TAX_RATES.BASIC_DEDUCTION;
  const blueFormDeduction = input.isBlueForm ? (input.blueFormDeduction || TAX_RATES.BLUE_FORM_DEDUCTION) : 0;
  const socialInsurance = input.socialInsurance || 0;
  const otherDeductions = (input.lifeInsurance || 0) + (input.earthquakeInsurance || 0) + (input.medicalExpenses || 0);
  
  const totalDeductions = basicDeduction + blueFormDeduction + socialInsurance + otherDeductions;
  const taxableIncome = Math.max(0, totalIncome - totalDeductions);
  
  // 各税額計算
  const incomeTax = calculateIncomeTax(taxableIncome);
  const residenceTax = calculateResidenceTax(taxableIncome);
  const businessTax = calculateBusinessTax(totalIncome);
  const consumptionTax = calculateConsumptionTax(input.totalRevenue);
  
  const totalTax = incomeTax + residenceTax + businessTax + consumptionTax;
  const netIncome = input.totalRevenue - input.businessExpenses - totalTax;
  
  // 所得税の詳細内訳
  const incomeTaxBreakdown = getIncomeTaxBreakdown(taxableIncome);
  const effectiveTaxRate = input.totalRevenue > 0 ? (totalTax / input.totalRevenue) * 100 : 0;
  
  return {
    totalIncome,
    taxableIncome,
    incomeTax,
    residenceTax,
    businessTax,
    consumptionTax,
    totalTax,
    netIncome,
    breakdown: {
      deductions: {
        basic: basicDeduction,
        blueForm: blueFormDeduction,
        socialInsurance,
        other: otherDeductions,
        total: totalDeductions
      },
      taxDetails: {
        incomeTaxBreakdown,
        effectiveTaxRate
      }
    }
  };
}

/**
 * 所得税計算（累進課税）
 */
function calculateIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  
  let tax = 0;
  let remainingIncome = taxableIncome;
  
  for (const bracket of TAX_RATES.INCOME_TAX_BRACKETS) {
    if (remainingIncome <= 0) break;
    
    const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableAtThisBracket * bracket.rate;
    remainingIncome -= taxableAtThisBracket;
  }
  
  return Math.round(tax);
}

/**
 * 住民税計算
 */
function calculateResidenceTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  
  // 所得割（10%）+ 均等割（5,000円）
  const incomeLevy = taxableIncome * TAX_RATES.RESIDENCE_TAX_RATE;
  const equalLevy = TAX_RATES.RESIDENCE_TAX_EQUAL;
  
  return Math.round(incomeLevy + equalLevy);
}

/**
 * 個人事業税計算
 */
function calculateBusinessTax(totalIncome: number): number {
  const taxableBusinessIncome = Math.max(0, totalIncome - TAX_RATES.BUSINESS_TAX_DEDUCTION);
  return Math.round(taxableBusinessIncome * TAX_RATES.BUSINESS_TAX_RATE);
}

/**
 * 消費税計算（簡易計算）
 */
function calculateConsumptionTax(totalRevenue: number): number {
  // 簡易課税制度を想定（売上高1,000万円以下の場合は免税）
  if (totalRevenue <= 10000000) return 0;
  
  // 簡易計算：売上高 × みなし仕入率を考慮した消費税額
  // ここでは概算として売上高の8%程度で計算
  return Math.round(totalRevenue * 0.08);
}

/**
 * 所得税の詳細内訳取得
 */
function getIncomeTaxBreakdown(taxableIncome: number): Array<{ bracket: string; amount: number; tax: number }> {
  if (taxableIncome <= 0) return [];
  
  const breakdown = [];
  let remainingIncome = taxableIncome;
  
  for (const bracket of TAX_RATES.INCOME_TAX_BRACKETS) {
    if (remainingIncome <= 0) break;
    
    const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    if (taxableAtThisBracket > 0) {
      breakdown.push({
        bracket: `${bracket.min.toLocaleString()}円 - ${bracket.max === Infinity ? '上限なし' : bracket.max.toLocaleString() + '円'}`,
        amount: taxableAtThisBracket,
        tax: Math.round(taxableAtThisBracket * bracket.rate)
      });
    }
    
    remainingIncome -= taxableAtThisBracket;
  }
  
  return breakdown;
}

/**
 * 節税対策の提案
 */
export interface TaxSavingTip {
  category: string;
  title: string;
  description: string;
  potentialSaving: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function getTaxSavingTips(result: TaxCalculationResult, input: TaxCalculationInput): TaxSavingTip[] {
  const tips: TaxSavingTip[] = [];
  
  // 青色申告の提案
  if (!input.isBlueForm && result.totalIncome > 0) {
    tips.push({
      category: '申告制度',
      title: '青色申告への変更',
      description: '青色申告特別控除65万円で大幅な節税が可能です',
      potentialSaving: Math.round(TAX_RATES.BLUE_FORM_DEDUCTION * 0.2), // 約20%の節税効果
      difficulty: 'medium'
    });
  }
  
  // 必要経費の見直し提案
  if (input.businessExpenses < input.totalRevenue * 0.3) {
    const additionalExpenses = input.totalRevenue * 0.1; // 10%の経費増加を想定
    tips.push({
      category: '必要経費',
      title: '経費計上の見直し',
      description: '家事按分や新たな必要経費の計上で節税できる可能性があります',
      potentialSaving: Math.round(additionalExpenses * 0.2),
      difficulty: 'easy'
    });
  }
  
  // 社会保険料控除の提案
  if (!input.socialInsurance || input.socialInsurance < 500000) {
    tips.push({
      category: '控除',
      title: '小規模企業共済・iDeCo加入',
      description: '小規模企業共済やiDeCoで所得控除を受けながら将来に備えられます',
      potentialSaving: Math.round(700000 * 0.2), // 年70万円拠出時の節税効果
      difficulty: 'easy'
    });
  }
  
  return tips.sort((a, b) => b.potentialSaving - a.potentialSaving);
}

/**
 * 税務カレンダー（主要な期限）
 */
export interface TaxDeadline {
  date: string;
  title: string;
  description: string;
  type: 'filing' | 'payment' | 'preparation';
}

export function getTaxCalendar(year: number = new Date().getFullYear()): TaxDeadline[] {
  return [
    {
      date: `${year}-01-31`,
      title: '法定調書提出期限',
      description: '支払調書等の提出期限',
      type: 'filing'
    },
    {
      date: `${year}-02-16`,
      title: '確定申告受付開始',
      description: '所得税の確定申告受付が開始されます',
      type: 'preparation'
    },
    {
      date: `${year}-03-15`,
      title: '確定申告期限',
      description: '所得税・贈与税の申告・納税期限',
      type: 'filing'
    },
    {
      date: `${year}-03-31`,
      title: '消費税申告期限（個人）',
      description: '個人事業者の消費税申告・納税期限',
      type: 'filing'
    },
    {
      date: `${year}-05-31`,
      title: '個人事業税第1期納付',
      description: '個人事業税第1期分の納付期限',
      type: 'payment'
    },
    {
      date: `${year}-06-30`,
      title: '住民税第1期納付',
      description: '住民税第1期分の納付期限',
      type: 'payment'
    },
    {
      date: `${year}-11-30`,
      title: '個人事業税第2期納付',
      description: '個人事業税第2期分の納付期限',
      type: 'payment'
    }
  ];
}

/**
 * 税率変更履歴（将来の税制改正対応用）
 */
export const TAX_RATE_HISTORY = {
  2024: TAX_RATES,
  // 将来の税制改正時にここに追加
};

/**
 * 月次予想税額計算
 */
export function calculateMonthlyTaxEstimate(monthlyRevenue: number, monthlyExpenses: number): number {
  const annualRevenue = monthlyRevenue * 12;
  const annualExpenses = monthlyExpenses * 12;
  
  const taxResult = calculateTax({
    totalRevenue: annualRevenue,
    businessExpenses: annualExpenses,
    isBlueForm: true
  });
  
  return Math.round(taxResult.totalTax / 12);
}