-- レシート処理エラーの確認クエリ
-- Supabase SQL Editorで実行してください

-- 1. テストユーザーのエラーログを確認
SELECT 
  'エラーログ' as データ種別,
  el.error_message as エラーメッセージ,
  el.error_type as エラー種別,
  el.page_url as ページURL,
  el.additional_data as 追加データ,
  el.created_at as エラー発生時刻
FROM error_logs el
JOIN user_profiles up ON el.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY el.created_at DESC
LIMIT 20;

-- 2. テストユーザーのアクティビティログを確認（レシート関連）
SELECT 
  'アクティビティログ' as データ種別,
  ua.action_type as アクション種別,
  ua.page_url as ページURL,
  ua.additional_data as 追加データ,
  ua.timestamp_utc as 時刻
FROM user_activities ua
JOIN user_profiles up ON ua.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
  AND (ua.page_url LIKE '%receipts%' OR ua.action_type LIKE '%receipt%')
ORDER BY ua.timestamp_utc DESC
LIMIT 20;

-- 3. テストユーザーの全アクティビティ（最新20件）
SELECT 
  '全アクティビティ' as データ種別,
  ua.action_type as アクション,
  ua.page_url as ページ,
  ua.timestamp_utc as 時刻
FROM user_activities ua
JOIN user_profiles up ON ua.user_id = up.id
WHERE up.email = 'airisgarden358@gmail.com'
ORDER BY ua.timestamp_utc DESC
LIMIT 20;