-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Create receipts table
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

-- Create RLS policies for receipts table
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own receipts" ON receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipts" ON receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts" ON receipts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts" ON receipts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for storage
CREATE POLICY "Users can upload their own receipt images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipt images" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipt images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipt images" ON storage.objects
  FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_upload_date ON receipts(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_processing_status ON receipts(processing_status);