# データベースマイグレーション手順

## 実行前の準備

1. Supabaseプロジェクトにアクセス
2. SQL Editorを開く

## 実行するSQL（順番通りに）

### 1. エラーログテーブル

```sql
-- ファイル: supabase/migrations/create_error_logs.sql の内容を実行
-- エラーログテーブルの作成
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type VARCHAR(100),
  page_url TEXT,
  user_agent TEXT,
  browser_info JSONB,
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) の設定
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみ全てのログを閲覧可能
CREATE POLICY "管理者は全てのエラーログを閲覧可能" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@keiri.app'
    )
  );

-- ユーザーは自分のエラーログのみ挿入可能
CREATE POLICY "ユーザーは自分のエラーログを挿入可能" ON error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- インデックスの作成
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
```

### 2. ユーザー行動追跡テーブル

```sql
-- ファイル: supabase/migrations/create_user_activities.sql の内容を実行
-- [上記で作成したファイルの内容をコピー]
```

### 3. 機能使用統計のRPC関数

```sql
-- ファイル: supabase/functions/upsert_feature_usage.sql の内容を実行
-- [上記で作成したファイルの内容をコピー]
```

## 実行後の確認

1. テーブルが正しく作成されているか確認
2. RLSポリシーが設定されているか確認
3. インデックスが作成されているか確認

```sql
-- テーブル確認
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- RLS確認
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

## 管理者アカウントの設定

管理画面にアクセスするためには、管理者アカウントが必要です：

1. Supabaseの認証画面でユーザーを作成
2. メールアドレスを `admin@keiri.app` に設定
3. または、RLSポリシーで別のメールアドレスを指定

## トラブルシューティング

### エラー: relation "error_logs" does not exist
→ マイグレーションSQLを実行してください

### エラー: RLS policy violation
→ 適切な権限でログインしているか確認してください

### データが表示されない
→ ブラウザでアプリにアクセスしてアクティビティを生成してください