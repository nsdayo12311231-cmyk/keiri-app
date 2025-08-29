import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedServerClient } from '@/lib/supabase/server';

interface BulkTransaction {
  date: string;
  amount: number;
  description: string;
  category: string;
  categoryType: 'revenue' | 'expense';
  confidence: number;
  isBusiness: boolean;
  categoryId?: string | null;
  originalData?: any;
}

export async function POST(request: NextRequest) {
  try {
    // まず認証チェックを最初に行う
    const supabase = await createAuthenticatedServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('一括保存 認証エラー:', authError);
      return NextResponse.json(
        { error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      );
    }

    const { transactions }: { transactions: BulkTransaction[] } = await request.json();

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: '取引データが正しく送信されていません' },
        { status: 400 }
      );
    }

    // ユーザープロフィールの存在確認
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'ユーザープロフィールが見つかりません' },
        { status: 404 }
      );
    }

    // 勘定科目IDの取得・マッピング
    const { data: accountCategories } = await supabase
      .from('account_categories')
      .select('id, name, category_type');

    const categoryMap = new Map(
      accountCategories?.map((cat: any) => [cat.name, cat.id]) || []
    );
    
    // カテゴリ名の正規化マッピング（分類器の出力をDBの勘定科目名に変換）
    const categoryNameMapping = new Map([
      // 収益系
      ['売上高', '売上高'],
      ['雑収入', '雑収入'],
      ['受取利息', '受取利息'],
      
      // 費用系
      ['消耗品費', '消耗品費'],
      ['旅費交通費', '旅費交通費'], 
      ['通信費', '通信費'],
      ['水道光熱費', '水道光熱費'],
      ['地代家賃', '地代家賃'],
      ['会議費', '会議費'],
      ['新聞図書費', '新聞図書費'],
      ['修繕費', '修繕費'],
      ['租税公課', '租税公課'],
      ['支払手数料', '支払手数料'],
      ['支払利息', '支払利息'],
      ['外注工賃', '外注工賃'],
      ['研修費', '研修費'],
      ['雑費', '雑費'],
      
      // フォールバック用の汎用科目
      ['事業費', '雑費'],
      ['個人支出', '雑費']
    ]);
    
    console.log('Available account categories:', accountCategories?.map(cat => cat.name));
    console.log('Category mapping:', Array.from(categoryNameMapping.entries()));

    // データベース挿入用の形式に変換
    const transactionInserts = transactions.map(t => {
      // カテゴリ名を正規化してからIDを取得
      let categoryId = t.categoryId;
      
      if (!categoryId) {
        const normalizedCategoryName = categoryNameMapping.get(t.category) || t.category;
        categoryId = categoryMap.get(normalizedCategoryName);
        
        // まだマッチしない場合、カテゴリタイプに基づくフォールバック
        if (!categoryId) {
          if (t.categoryType === 'expense') {
            categoryId = categoryMap.get('雑費') || categoryMap.get('事業費') || categoryMap.get('消耗品費');
          } else if (t.categoryType === 'revenue') {
            categoryId = categoryMap.get('雑収入') || categoryMap.get('売上高');
          }
        }
        
        console.log(`Transaction: "${t.description}" -> Category: "${t.category}" -> Normalized: "${normalizedCategoryName}" -> ID: ${categoryId}`);
      }
      
      return {
        user_id: user.id,
        account_id: null, // CSVインポートの場合は不明
        amount: t.amount,
        description: t.description,
        transaction_date: t.date,
        transaction_type: t.categoryType, // 追加：transaction_typeを設定
        category_id: categoryId,
        is_business: t.isBusiness,
        confidence_score: t.confidence,
        is_confirmed: false, // インポート直後は未確認
        external_id: null,
        metadata: {
          import_source: 'csv',
          original_format: t.originalData?.format,
          auto_classified: true,
          classification_confidence: t.confidence,
          import_timestamp: new Date().toISOString()
        }
      };
    });

    // バッチ挿入の実行
    const { data: insertedTransactions, error: insertError } = await supabase
      .from('transactions')
      .insert(transactionInserts)
      .select();

    if (insertError) {
      console.error('取引データ挿入エラー:', insertError);
      return NextResponse.json(
        { error: '取引データの保存中にエラーが発生しました' },
        { status: 500 }
      );
    }

    // 簡単な仕訳エントリも自動作成（複式簿記対応）
    const journalEntries: any[] = [];
    const journalEntryLines: any[] = [];

    for (let i = 0; i < insertedTransactions.length; i++) {
      const transaction = insertedTransactions[i];
      const originalTransaction = transactions[i];

      const journalEntry = {
        user_id: user.id,
        transaction_id: transaction.id,
        entry_date: transaction.transaction_date,
        description: transaction.description,
        total_amount: Math.abs(transaction.amount),
        is_confirmed: false
      };

      journalEntries.push(journalEntry);
    }

    // 仕訳エントリを挿入
    const { data: insertedJournalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .insert(journalEntries)
      .select();

    if (!journalError && insertedJournalEntries) {
      // 仕訳明細を作成
      for (let i = 0; i < insertedJournalEntries.length; i++) {
        const journalEntry = insertedJournalEntries[i];
        const transaction = insertedTransactions[i];
        const originalTransaction = transactions[i];

        // 現金勘定のIDを取得
        const cashCategoryId = categoryMap.get('現金') || categoryMap.get('普通預金');

        if (originalTransaction.categoryType === 'revenue') {
          // 収入の場合: 借方=現金、貸方=売上等
          journalEntryLines.push({
            journal_entry_id: journalEntry.id,
            account_category_id: cashCategoryId, // 現金
            debit_amount: Math.abs(transaction.amount),
            credit_amount: 0,
            description: '現金増加'
          });
          journalEntryLines.push({
            journal_entry_id: journalEntry.id,
            account_category_id: transaction.category_id,
            debit_amount: 0,
            credit_amount: Math.abs(transaction.amount),
            description: originalTransaction.category
          });
        } else {
          // 支出の場合: 借方=経費等、貸方=現金
          journalEntryLines.push({
            journal_entry_id: journalEntry.id,
            account_category_id: transaction.category_id,
            debit_amount: Math.abs(transaction.amount),
            credit_amount: 0,
            description: originalTransaction.category
          });
          journalEntryLines.push({
            journal_entry_id: journalEntry.id,
            account_category_id: cashCategoryId, // 現金
            debit_amount: 0,
            credit_amount: Math.abs(transaction.amount),
            description: '現金減少'
          });
        }
      }

      // 仕訳明細を挿入
      await supabase
        .from('journal_entry_lines')
        .insert(journalEntryLines);
    }

    return NextResponse.json({
      success: true,
      inserted: insertedTransactions.length,
      message: `${insertedTransactions.length}件の取引データを保存しました`,
      transactionIds: insertedTransactions.map(t => t.id)
    });

  } catch (error) {
    console.error('一括保存エラー:', error);
    return NextResponse.json(
      { error: '取引データの保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedServerClient();

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // ユーザーの取引データを取得
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, amount, description, transaction_date, category_id, is_business, is_confirmed, created_at')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(1000);

    if (fetchError) {
      console.error('取引データ取得エラー:', fetchError);
      return NextResponse.json(
        { error: '取引データの取得中にエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transactions: transactions || [],
      count: transactions?.length || 0
    });

  } catch (error) {
    console.error('取引データ取得エラー:', error);
    return NextResponse.json(
      { error: '取引データの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}