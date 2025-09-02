-- 機能使用統計のUpsert関数
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
    -- カテゴリを自動判定
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