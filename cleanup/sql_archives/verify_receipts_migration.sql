-- Keiri App - Verify Receipts Migration Status
-- Run this in Supabase SQL Editor to check if migration is needed

-- Check if receipts table exists
SELECT 
  'receipts_table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'receipts'
    ) THEN 'EXISTS ✓' 
    ELSE 'MISSING ✗' 
  END as status;

-- Check if receipts storage bucket exists
SELECT 
  'receipts_bucket' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'receipts'
    ) THEN 'EXISTS ✓'
    ELSE 'MISSING ✗'
  END as status;

-- Check if RLS policies exist for receipts table
SELECT 
  'receipts_rls_policies' as check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'receipts' AND schemaname = 'public'
    ) >= 4 THEN 'EXISTS ✓ (' || (
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'receipts' AND schemaname = 'public'
    ) || ' policies)'
    ELSE 'MISSING ✗ (' || COALESCE((
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'receipts' AND schemaname = 'public'
    ), 0) || ' policies)'
  END as status;

-- Check if storage RLS policies exist
SELECT 
  'storage_rls_policies' as check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%receipt%'
    ) >= 4 THEN 'EXISTS ✓ (' || (
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%receipt%'
    ) || ' policies)'
    ELSE 'MISSING ✗ (' || COALESCE((
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%receipt%'
    ), 0) || ' policies)'
  END as status;

-- Check if indexes exist
SELECT 
  'receipts_indexes' as check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_indexes 
      WHERE tablename = 'receipts' 
        AND schemaname = 'public'
        AND indexname LIKE 'idx_receipts_%'
    ) >= 3 THEN 'EXISTS ✓ (' || (
      SELECT COUNT(*) FROM pg_indexes 
      WHERE tablename = 'receipts' 
        AND schemaname = 'public'
        AND indexname LIKE 'idx_receipts_%'
    ) || ' indexes)'
    ELSE 'MISSING ✗ (' || COALESCE((
      SELECT COUNT(*) FROM pg_indexes 
      WHERE tablename = 'receipts' 
        AND schemaname = 'public'
        AND indexname LIKE 'idx_receipts_%'
    ), 0) || ' indexes)'
  END as status;