-- ユーザーアクティビティ追跡テーブル
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'page_visit', 'click', 'form_submit', 'error', 'feature_use' etc.
  page_url TEXT NOT NULL,
  element_selector TEXT, -- クリックされた要素のセレクタ
  element_text TEXT, -- クリックされた要素のテキスト
  referrer TEXT,
  user_agent TEXT,
  browser_info JSONB,
  screen_resolution VARCHAR(20),
  timestamp_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INTEGER, -- ページ滞在時間など
  additional_data JSONB, -- その他のカスタムデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーセッション管理テーブル  
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  pages_visited INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
  os VARCHAR(50),
  browser VARCHAR(50),
  ip_address INET,
  country VARCHAR(50),
  city VARCHAR(50)
);

-- 機能使用統計テーブル
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  feature_name VARCHAR(100) NOT NULL, -- 'csv_import', 'ocr_scan', 'report_generate' etc.
  feature_category VARCHAR(50), -- 'import', 'analysis', 'export' etc.
  usage_count INTEGER DEFAULT 1,
  first_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  average_duration_ms INTEGER,
  total_errors INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

-- パフォーマンス計測テーブル
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255) REFERENCES user_sessions(session_id),
  page_url TEXT NOT NULL,
  load_time_ms INTEGER,
  first_contentful_paint_ms INTEGER,
  largest_contentful_paint_ms INTEGER,
  first_input_delay_ms INTEGER,
  cumulative_layout_shift DECIMAL(5,3),
  navigation_type VARCHAR(20), -- 'navigate', 'reload', 'back_forward'
  connection_type VARCHAR(20), -- '4g', 'wifi', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) の設定
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- 管理者は全データ閲覧可能
CREATE POLICY "管理者は全ての活動ログを閲覧可能" ON user_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@keiri.app'
    )
  );

-- ユーザーは自分のデータを挿入・更新可能
CREATE POLICY "ユーザーは自分の活動ログを挿入可能" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "ユーザーは自分のセッション情報を管理可能" ON user_sessions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "ユーザーは自分の機能使用統計を管理可能" ON feature_usage
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "ユーザーは自分のパフォーマンス情報を挿入可能" ON performance_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- インデックスの作成（パフォーマンス最適化）
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_session_id ON user_activities(session_id);
CREATE INDEX idx_user_activities_timestamp ON user_activities(timestamp_utc);
CREATE INDEX idx_user_activities_action_type ON user_activities(action_type);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);

CREATE INDEX idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX idx_feature_usage_feature_name ON feature_usage(feature_name);

CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_page_url ON performance_metrics(page_url);

-- 関数：セッションの最後の活動時間を更新
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_sessions 
  SET 
    last_activity = NOW(),
    pages_visited = pages_visited + 1
  WHERE session_id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー：活動記録時にセッション情報を更新
CREATE TRIGGER trigger_update_session_activity
  AFTER INSERT ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();