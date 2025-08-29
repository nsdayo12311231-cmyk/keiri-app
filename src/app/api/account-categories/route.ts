import { NextResponse } from 'next/server';
import { createAuthenticatedServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createAuthenticatedServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 勘定科目一覧を取得
    const { data: categories, error } = await supabase
      .from('account_categories')
      .select('id, name, category_type')
      .order('category_type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('勘定科目取得エラー:', error);
      return NextResponse.json(
        { error: '勘定科目の取得中にエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      categories: categories || []
    });

  } catch (error) {
    console.error('勘定科目API エラー:', error);
    return NextResponse.json(
      { error: '勘定科目の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}