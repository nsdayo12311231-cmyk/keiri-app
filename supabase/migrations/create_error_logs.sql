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
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- インデックスの作成
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);