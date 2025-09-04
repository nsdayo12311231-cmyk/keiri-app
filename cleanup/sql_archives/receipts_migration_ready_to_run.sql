-- Keiri App - Receipts Database Migration
-- Execute this script in your Supabase SQL Editor
-- Project: xyybfcjjooizufgvkzgg

-- ============================================================================
-- RECEIPTS STORAGE AND DATABASE MIGRATION
-- ============================================================================

-- Step 1: Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_size INTEGER,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  ocr_text TEXT,
  extracted_data JSONB DEFAULT '{}',
  is_processed BOOLEAN DEFAULT FALSE,
  transaction_id TEXT, -- Reference to created transaction
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Step 3: Enable RLS on receipts table
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for receipts table
CREATE POLICY "Users can view their own receipts" ON receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipts" ON receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts" ON receipts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts" ON receipts
  FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Create RLS policies for storage
CREATE POLICY "Users can upload their own receipt images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipt images" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipt images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipt images" ON storage.objects
  FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Step 6: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_upload_date ON receipts(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_processing_status ON receipts(processing_status);

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify the migration worked)
-- ============================================================================

-- Verify the receipts table was created
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'receipts';

-- Verify the storage bucket was created
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'receipts';

-- Verify indexes were created
SELECT 
  indexname, 
  tablename, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'receipts' 
  AND schemaname = 'public';

-- Verify RLS policies were created
SELECT 
  schemaname,
  tablename, 
  policyname, 
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('receipts', 'objects');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================