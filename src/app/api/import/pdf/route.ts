import { NextRequest, NextResponse } from 'next/server';
import { parsePDF } from '@/lib/utils/pdf-parser';
import { parsePDFv2 } from '@/lib/utils/pdf-parser-v2';
import { extractTransactionsFromImagePDF, postProcessOCRTransactions } from '@/lib/utils/pdf-ocr';
import { classifyTransactions } from '@/lib/utils/category-classifier';
import { createServerClient, createSimpleServerClient } from '@/lib/supabase/server';

// 改善されたPDF処理関数
async function parsePDFImproved(pdfBuffer: Buffer) {
  try {
    console.log('改善されたPDF処理を開始...');
    
    // より安全なpdf-parse使用方法
    const pdfParse = await import('pdf-parse');
    
    // pdf-parseを最小限のオプションで実行
    const options = {
      // 問題を引き起こす可能性のあるオプションを無効化
      max: 0,
      normalizeWhitespace: false
    };
    
    const data = await (pdfParse.default || pdfParse)(pdfBuffer, options);
    
    if (!data || !data.text) {
      throw new Error('PDFテキスト抽出に失敗');
    }
    
    console.log('改善PDF処理成功 - テキスト長:', data.text.length);
    
    // 既存のパターンマッチング処理を使用
    const { parsePDFText } = await import('@/lib/utils/pdf-parser');
    const result = parsePDFText(data.text);
    
    return {
      ...result,
      format: result.format || 'improved-pdf-parse'
    };
    
  } catch (error) {
    console.error('改善PDF処理エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`改善PDF処理失敗: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDFファイルを選択してください' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      );
    }

    // PDFファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Supabase認証チェック - Authorizationヘッダーまたはクッキーから認証
    const authHeader = request.headers.get('authorization');
    console.log('PDF API - 認証ヘッダー:', authHeader ? 'あり' : 'なし');
    
    let supabase;
    
    if (authHeader?.startsWith('Bearer ')) {
      console.log('PDF API - Bearer認証を使用');
      // Authorizationヘッダーがある場合
      const { createAuthenticatedServerClient } = await import('@/lib/supabase/server');
      supabase = await createAuthenticatedServerClient(request);
    } else {
      console.log('PDF API - クッキー認証を使用');
      // クッキー認証の場合（フォールバック付き）
      try {
        supabase = await createServerClient();
      } catch (serverError) {
        console.warn('サーバークライアント作成失敗、フォールバックを使用:', serverError);
        supabase = createSimpleServerClient();
      }
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('PDF API - 認証エラー:', { authError, hasUser: !!user });
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    console.log('PDF API - 認証成功:', user.email);

    // PDF処理の履歴を記録
    const { data: pdfImport, error: pdfImportError } = await supabase
      .from('pdf_imports')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_size: file.size,
        status: 'processing'
      } as any)
      .select('id')
      .single();

    const pdfImportId = (pdfImport as any)?.id;
    console.log('PDF処理履歴記録:', pdfImportId);

    // Step 1: 効率的なPDF処理 - 最適化されたアプローチ
    console.log('PDF処理開始...');
    let textBasedResult;
    let transactions = [];
    let processingMethod = 'pdf2json';
    let confidence = 1.0;
    let errors = [];

    try {
      // 最初にpdf2jsonのみ試行（高速・軽量）
      textBasedResult = await parsePDFv2(pdfBuffer);
      transactions = textBasedResult.transactions;
      errors = textBasedResult.errors;
      
      console.log(`pdf2json完了: ${transactions.length}件の取引を抽出`);

    } catch (pdf2jsonError) {
      const errorMessage = pdf2jsonError instanceof Error ? pdf2jsonError.message : 'Unknown error';
      console.log('pdf2json失敗 - 画像PDFの可能性:', errorMessage);
      errors.push(`pdf2json処理エラー: ${errorMessage}`);
      
      // 画像PDFと判定し、すぐにGeminiAPIへ
      textBasedResult = {
        transactions: [],
        format: 'image-based',
        errors: errors,
        isTextBased: false
      };
    }

    // Step 2: テキスト抽出で取引データが見つからない場合、GeminiAPIを試行
    if (transactions.length === 0) {
      if (textBasedResult && textBasedResult.isTextBased === false) {
        console.log('画像ベースPDF検出 - GeminiAPI OCRを試行...');
        
        try {
          const { parsePDFWithGemini } = await import('@/lib/utils/gemini-pdf-ocr');
          const geminiResult = await parsePDFWithGemini(pdfBuffer);
          
          transactions = geminiResult.transactions;
          processingMethod = 'gemini-ocr';
          errors = [...errors, ...geminiResult.errors];
          
          console.log('GeminiAPI結果:', {
            transactions: transactions.length,
            format: geminiResult.format,
            errors: errors.length
          });
          
        } catch (geminiError) {
          console.log('GeminiAPI処理失敗:', geminiError);
          const errorMessage = geminiError instanceof Error ? geminiError.message : 'Unknown error';
          errors.push(`GeminiAPI処理エラー: ${errorMessage}`);
          errors.push(...textBasedResult.errors);
        }
      } else {
        console.log('テキストベースPDFだが、パターンマッチング失敗');
        console.log('抽出されたテキストサンプル:', textBasedResult?.format);
        
        if (textBasedResult && textBasedResult.errors && textBasedResult.errors.length > 0) {
          // 詳細なエラーメッセージを使用
          errors.push(...textBasedResult.errors);
        } else {
          // フォールバック用の汎用メッセージ  
          errors.push('PDFからテキストを抽出できましたが、対応していない明細形式です。');
          errors.push('対応形式: 楽天カード、三井住友カード、PayPayカード、銀行明細PDF');
          errors.push('確認事項: PDFに取引明細が含まれているか、パスワード保護されていないか');
        }
      }
    }

    // PDF処理履歴を更新
    if (pdfImportId) {
      await supabase
        .from('pdf_imports')
        .update({
          status: transactions.length > 0 ? 'completed' : 'failed',
          processing_method: processingMethod,
          transactions_count: transactions.length,
          error_message: transactions.length === 0 ? errors.join('; ') : null
        } as any)
        .eq('id', pdfImportId);
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        error: 'PDFから取引データを抽出できませんでした',
        details: errors,
        processingMethod,
        isImagePDF: textBasedResult && !textBasedResult.isTextBased,
        format: textBasedResult?.format || 'unknown',
        helpMessage: textBasedResult && !textBasedResult.isTextBased 
          ? 'この楽天カードPDFは画像形式のため、現在読み取り対応しておりません。CSVファイルのダウンロードをお勧めします。'
          : 'PDFの形式が対応していない可能性があります。CSVファイルでのインポートをお試しください。'
      }, { status: 400 });
    }

    // ユーザーのアカウントを安全に取得または作成
    let userAccount;
    
    // 最初に既存のアカウントを取得（最古のアカウントを優先）
    const { data: existingAccounts, error: fetchError } = await supabase
      .from('accounts')
      .select('id, account_name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('アカウント取得エラー:', fetchError);
      return NextResponse.json({
        error: 'アカウント情報の取得に失敗しました',
        details: [fetchError.message]
      }, { status: 500 });
    }

    if (existingAccounts && existingAccounts.length > 0) {
      // 既存のアカウントを使用（最古のものを選択）
      userAccount = existingAccounts[0] as any;
      console.log(`既存アカウントを使用: ${userAccount.account_name} (ID: ${userAccount.id})`);
    } else {
      // デフォルトアカウントを作成（通常のINSERT）
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          account_name: 'メインアカウント',
          account_type: 'bank',  // 有効な値に修正
          is_active: true
        } as any)
        .select('id, account_name')
        .single();

      if (accountError) {
        console.error('デフォルトアカウント作成エラー:', accountError);
        return NextResponse.json({
          error: 'デフォルトアカウントの作成に失敗しました',
          details: [accountError.message]
        }, { status: 500 });
      }

      userAccount = newAccount as any;
      console.log(`新規アカウントを作成: ${userAccount.account_name} (ID: ${userAccount.id})`);
    }

    // 最適化された重複チェック - 最近1ヶ月のみ対象
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('transaction_date, amount, description')
      .eq('user_id', user.id)
      .gte('transaction_date', oneMonthAgo.toISOString().split('T')[0])
      .limit(1000); // 最大1000件に制限

    const existingHashes = new Set(
      existingTransactions?.map((t: any) => 
        `${t.transaction_date}_${t.amount}_${t.description.substring(0, 20)}`
      ) || []
    );

    const unique = transactions.filter(t => {
      const hash = `${t.date}_${t.amount}_${t.description.substring(0, 20)}`;
      return !existingHashes.has(hash);
    });

    const duplicates = transactions.length - unique.length;

    // カテゴリ自動分類
    const classifiedTransactions = classifyTransactions(unique);

    // 勘定科目マッピング（必要な場合のみ取得）
    let categoryMap = new Map();
    if (unique.length > 0) {
      const { data: accountCategories } = await supabase
        .from('account_categories')
        .select('id, name, category_type');
      
      categoryMap = new Map(
        accountCategories?.map((cat: any) => [cat.name, { id: cat.id, type: cat.category_type }]) || []
      );
    }

    // データベースに保存するためのデータ整形
    const transactionsToInsert = classifiedTransactions.map(t => ({
      user_id: user.id,
      account_id: userAccount.id, // 実際のユーザーアカウントID
      amount: t.amount,
      description: t.description,
      transaction_date: t.date,
      transaction_type: t.amount > 0 ? 'revenue' as const : 'expense' as const,
      is_business: t.classification.isBusiness || false,
      is_confirmed: false,
      confidence_score: t.classification.confidence || 0.5
      // categoryカラムは存在しないため削除
    }));

    // データベースに一括挿入（トランザクション処理）
    let insertedTransactions = [];
    if (transactionsToInsert.length > 0) {
      console.log(`データベースに${transactionsToInsert.length}件の取引を保存中...`);
      console.log(`使用するアカウントID: ${userAccount.id}`);
      
      try {
        // バッチサイズを制限してメモリ効率を改善
        const BATCH_SIZE = 100;
        const batches = [];
        
        for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
          const batch = transactionsToInsert.slice(i, i + BATCH_SIZE);
          batches.push(batch);
        }

        for (const [index, batch] of batches.entries()) {
          console.log(`バッチ ${index + 1}/${batches.length} (${batch.length}件) を保存中...`);
          
          const { data: insertResult, error: insertError } = await supabase
            .from('transactions')
            .insert(batch as any)
            .select('*');

          if (insertError) {
            console.error(`バッチ ${index + 1} 保存エラー:`, insertError);
            throw new Error(`取引データ保存エラー (バッチ ${index + 1}): ${insertError.message}`);
          }

          if (insertResult) {
            insertedTransactions.push(...insertResult);
          }
        }

        console.log(`✅ ${insertedTransactions.length}件の取引をデータベースに保存しました`);
        
      } catch (error) {
        console.error('取引データ保存エラー:', error);
        return NextResponse.json({
          error: '取引データの保存中にエラーが発生しました',
          details: [error instanceof Error ? error.message : 'Unknown error']
        }, { status: 500 });
      }
    }

    // レスポンス用データ整形
    const responseTransactions = classifiedTransactions.map(t => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
      category: t.classification.category,
      categoryType: t.classification.categoryType,
      confidence: Math.min(t.classification.confidence, confidence), // OCR信頼度と分類信頼度の小さい方
      isBusiness: t.classification.isBusiness,
      categoryId: categoryMap.get(t.classification.category)?.id || null,
      originalData: (t as any).originalData || {},
      processingMethod
    }));

    return NextResponse.json({
      transactions: responseTransactions,
      summary: {
        total: transactions.length,
        unique: unique.length,
        duplicates: duplicates,
        format: textBasedResult.format,
        processingMethod,
        confidence: Math.round(confidence * 100),
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('PDF処理エラー:', error);
    return NextResponse.json(
      { 
        error: 'PDF処理中にエラーが発生しました',
        details: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    );
  }
}