-- アクティビティ追跡システムのテーブル作成
-- Supabase SQL Editorで実行してください

-- 1. ユーザーアクティビティテーブル
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  page_url TEXT NOT NULL,
  element_selector TEXT,
  element_text TEXT,
  referrer TEXT,
  user_agent TEXT,
  browser_info JSONB,
  screen_resolution VARCHAR(20),
  timestamp_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INTEGER,
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ユーザーセッションテーブル
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  pages_visited INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  device_type VARCHAR(20),
  os VARCHAR(50),
  browser VARCHAR(50),
  ip_address INET,
  country VARCHAR(50),
  city VARCHAR(50)
);

-- 3. 機能使用統計テーブル
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  feature_name VARCHAR(100) NOT NULL,
  feature_category VARCHAR(50),
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

-- 4. パフォーマンス計測テーブル
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
  navigation_type VARCHAR(20),
  connection_type VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. エラーログテーブル
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

-- 6. RLS (Row Level Security) の設定
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLSポリシー（開発・テスト用）
-- ユーザーは自分のデータをCRUD可能
CREATE POLICY "users can manage own activities" ON user_activities
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "users can manage own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "users can manage own features" ON feature_usage
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users can manage own performance" ON performance_metrics
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "users can manage own errors" ON error_logs
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- 8. インデックスの作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON user_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_user_activities_action_type ON user_activities(action_type);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_name ON feature_usage(feature_name);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_page_url ON performance_metrics(page_url);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

-- 9. 機能使用統計のUpsert関数
CREATE OR REPLACE FUNCTION upsert_feature_usage(
  p_user_id UUID,
  p_feature_name VARCHAR(100),
  p_success BOOLEAN DEFAULT TRUE,
  p_duration_ms INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO feature_usage (
    user_id,
    feature_name,
    feature_category,
    usage_count,
    first_used_at,
    last_used_at,
    success_rate,
    average_duration_ms,
    total_errors
  )
  VALUES (
    p_user_id,
    p_feature_name,
    CASE 
      WHEN p_feature_name LIKE '%import%' OR p_feature_name LIKE '%csv%' OR p_feature_name LIKE '%ocr%' THEN 'import'
      WHEN p_feature_name LIKE '%report%' OR p_feature_name LIKE '%export%' THEN 'export'
      WHEN p_feature_name LIKE '%analysis%' OR p_feature_name LIKE '%classify%' THEN 'analysis'
      ELSE 'other'
    END,
    1,
    NOW(),
    NOW(),
    CASE WHEN p_success THEN 100.00 ELSE 0.00 END,
    p_duration_ms,
    CASE WHEN p_success THEN 0 ELSE 1 END
  )
  ON CONFLICT (user_id, feature_name) 
  DO UPDATE SET
    usage_count = feature_usage.usage_count + 1,
    last_used_at = NOW(),
    success_rate = (
      (feature_usage.success_rate * feature_usage.usage_count + CASE WHEN p_success THEN 100.00 ELSE 0.00 END) 
      / (feature_usage.usage_count + 1)
    ),
    average_duration_ms = CASE 
      WHEN p_duration_ms IS NOT NULL AND feature_usage.average_duration_ms IS NOT NULL THEN
        ((feature_usage.average_duration_ms * feature_usage.usage_count) + p_duration_ms) / (feature_usage.usage_count + 1)
      WHEN p_duration_ms IS NOT NULL AND feature_usage.average_duration_ms IS NULL THEN
        p_duration_ms
      ELSE
        feature_usage.average_duration_ms
    END,
    total_errors = feature_usage.total_errors + CASE WHEN p_success THEN 0 ELSE 1 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. セッション活動更新のトリガー関数
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

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_update_session_activity ON user_activities;
CREATE TRIGGER trigger_update_session_activity
  AFTER INSERT ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();