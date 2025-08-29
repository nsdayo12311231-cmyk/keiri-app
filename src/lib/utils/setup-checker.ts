/**
 * ユーザーの初期設定完了状況をチェック
 */

import { supabase } from '@/lib/supabase/client';

export interface SetupStatus {
  overall: number; // 全体の完了率 (0-100)
  basicProfile: boolean;
  detailedProfile: boolean;
  expenseSettings: boolean;
  taxSettings: boolean;
  incompleteItems: string[];
  nextRecommendedStep?: {
    title: string;
    description: string;
    href: string;
    priority: 'high' | 'medium' | 'low';
  };
}

export async function checkUserSetupStatus(userId: string): Promise<SetupStatus> {
  const incompleteItems: string[] = [];
  let completedItems = 0;
  const totalItems = 4; // 基本、詳細、経費、税務

  try {
    // 1. 基本プロフィールチェック
    const { data: basicProfile } = await supabase
      .from('user_profiles')
      .select('full_name, business_type')
      .eq('id', userId)
      .single();

    const basicComplete = basicProfile?.full_name && basicProfile?.business_type;
    if (basicComplete) {
      completedItems++;
    } else {
      incompleteItems.push('基本プロフィール');
    }

    // 2. 詳細プロフィールチェック
    const { data: detailedProfile } = await supabase
      .from('user_detailed_profiles')
      .select('major_industry_category, detailed_business_type')
      .eq('user_id', userId)
      .single();

    const detailedComplete = detailedProfile?.major_industry_category && 
                            detailedProfile?.detailed_business_type;
    if (detailedComplete) {
      completedItems++;
    } else {
      incompleteItems.push('詳細プロフィール');
    }

    // 3. 経費設定チェック
    const { data: expenseSettings } = await supabase
      .from('user_expense_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const expenseComplete = expenseSettings !== null;
    if (expenseComplete) {
      completedItems++;
    } else {
      incompleteItems.push('経費設定');
    }

    // 4. 税務設定チェック
    const { data: taxSettings } = await supabase
      .from('user_tax_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    const taxComplete = taxSettings !== null;
    if (taxComplete) {
      completedItems++;
    } else {
      incompleteItems.push('税務設定');
    }

    // 次の推奨ステップを決定
    let nextRecommendedStep;
    if (!basicComplete) {
      nextRecommendedStep = {
        title: '基本プロフィール設定',
        description: '氏名と事業形態を設定しましょう',
        href: '/profile/basic',
        priority: 'high' as const
      };
    } else if (!detailedComplete) {
      nextRecommendedStep = {
        title: '詳細プロフィール設定',
        description: '業種と働き方を詳しく設定しましょう',
        href: '/profile/setup',
        priority: 'high' as const
      };
    } else if (!expenseComplete) {
      nextRecommendedStep = {
        title: '経費設定',
        description: '自動分類の精度を上げるため経費設定をしましょう',
        href: '/profile/expenses',
        priority: 'medium' as const
      };
    } else if (!taxComplete) {
      nextRecommendedStep = {
        title: '税務設定',
        description: '申告方法と税理士情報を設定しましょう',
        href: '/profile/tax',
        priority: 'low' as const
      };
    }

    return {
      overall: Math.round((completedItems / totalItems) * 100),
      basicProfile: basicComplete,
      detailedProfile: detailedComplete,
      expenseSettings: expenseComplete,
      taxSettings: taxComplete,
      incompleteItems,
      nextRecommendedStep
    };

  } catch (error) {
    console.error('Setup status check error:', error);
    return {
      overall: 0,
      basicProfile: false,
      detailedProfile: false,
      expenseSettings: false,
      taxSettings: false,
      incompleteItems: ['基本プロフィール', '詳細プロフィール', '経費設定', '税務設定'],
      nextRecommendedStep: {
        title: '基本プロフィール設定',
        description: '氏名と事業形態を設定しましょう',
        href: '/profile/basic',
        priority: 'high'
      }
    };
  }
}

/**
 * 設定完了状況に応じたメッセージを生成
 */
export function getSetupStatusMessage(setupStatus: SetupStatus): {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
} {
  const { overall, incompleteItems } = setupStatus;

  if (overall === 100) {
    return {
      title: '🎉 初期設定完了！',
      message: 'すべての設定が完了しています。高精度な経費自動分類をお楽しみください！',
      type: 'success'
    };
  } else if (overall >= 75) {
    return {
      title: '🚀 もう少しで完了',
      message: `残り${incompleteItems.length}項目で設定完了です。`,
      type: 'info'
    };
  } else if (overall >= 50) {
    return {
      title: '⚡ 設定を続けましょう',
      message: `${incompleteItems.length}項目の設定が未完了です。より正確な分類のために設定をお勧めします。`,
      type: 'warning'
    };
  } else {
    return {
      title: '🎯 初期設定をお勧めします',
      message: '経費の自動分類精度を向上させるため、プロフィール設定を完了しましょう。',
      type: 'warning'
    };
  }
}

/**
 * 設定項目のアイコンを取得
 */
export function getSetupItemIcon(item: string): string {
  switch (item) {
    case '基本プロフィール': return '👤';
    case '詳細プロフィール': return '🏢';
    case '経費設定': return '💰';
    case '税務設定': return '📋';
    default: return '⚙️';
  }
}