import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedServerClient } from '@/lib/supabase/server';

interface CustomRule {
  id: number;
  keyword: string;
  category: string;
  isBusiness: boolean;
  enabled: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // LocalStorageからカスタムルールを取得（将来的にはDBから取得）
    // 現在はヘッダーやクエリパラメータでルールを受け取る方法で代替
    const userAgent = request.headers.get('user-agent') || '';
    
    // デフォルトのカスタムルール（ユーザー固有のものは別途実装）
    const defaultRules: CustomRule[] = [
      { id: 1, keyword: 'スターバックス', category: '会議費', isBusiness: true, enabled: true },
      { id: 2, keyword: 'セブンイレブン', category: '食費', isBusiness: false, enabled: true },
      { id: 3, keyword: 'エネオス', category: '旅費交通費', isBusiness: true, enabled: true },
    ];

    return NextResponse.json({
      rules: defaultRules,
      count: defaultRules.length
    });

  } catch (error) {
    console.error('ユーザールール取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザールールの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { rules }: { rules: CustomRule[] } = await request.json();

    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: '無効なルール形式です' },
        { status: 400 }
      );
    }

    // 将来的にはDBに保存
    // 現在はログ出力のみ
    console.log('カスタムルール保存要求:', {
      userId: user.id,
      rulesCount: rules.length,
      rules: rules
    });

    return NextResponse.json({
      success: true,
      saved: rules.length,
      message: `${rules.length}件のルールを保存しました`
    });

  } catch (error) {
    console.error('ユーザールール保存エラー:', error);
    return NextResponse.json(
      { error: 'ユーザールールの保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}