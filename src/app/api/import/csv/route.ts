import { NextRequest, NextResponse } from 'next/server';
import { parseCSV, deduplicateTransactions } from '@/lib/utils/csv-parser';
import { classifyTransactions } from '@/lib/utils/category-classifier';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Supabaseクライアントを作成（クッキーベース認証）
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    if (file.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'CSVファイルを選択してください' },
        { status: 400 }
      );
    }

    // ファイル内容を読み取り
    const csvContent = await file.text();
    
    // CSV解析
    const { transactions, format, errors } = parseCSV(csvContent);

    if (errors.length > 0) {
      console.warn('CSV解析時の警告:', errors);
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        error: 'インポート可能な取引データが見つかりませんでした',
        details: errors
      }, { status: 400 });
    }

    // 既存の取引データを取得（重複チェック用）
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('transaction_date, amount, description')
      .eq('user_id', user.id);

    const existingData = existingTransactions?.map((t: any) => ({
      date: t.transaction_date,
      amount: t.amount,
      description: t.description,
      originalData: {} // TransactionDataに必要
    })) || [];

    // 重複チェック・マージ
    const { unique, duplicates } = deduplicateTransactions(transactions.map(t => ({...t, originalData: {}})), existingData);

    // カテゴリ自動分類
    const classifiedTransactions = classifyTransactions(unique);

    // 勘定科目IDを取得してマッピング
    const { data: accountCategories } = await supabase
      .from('account_categories')
      .select('id, name, category_type');

    const categoryMap = new Map(
      accountCategories?.map((cat: any) => [cat.name, { id: cat.id, type: cat.category_type }]) || []
    );

    // レスポンス用データ整形
    const responseTransactions = classifiedTransactions.map(t => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
      category: t.classification.category,
      categoryType: t.classification.categoryType,
      confidence: t.classification.confidence,
      isBusiness: t.classification.isBusiness,
      categoryId: categoryMap.get(t.classification.category)?.id || null,
      originalData: t.originalData
    }));

    return NextResponse.json({
      transactions: responseTransactions,
      summary: {
        total: transactions.length,
        unique: unique.length,
        duplicates: duplicates.length,
        format,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('CSV処理エラー:', error);
    return NextResponse.json(
      { error: 'CSV処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}