-- Add category_id and transaction_type columns to transactions table
ALTER TABLE transactions 
ADD COLUMN category_id UUID REFERENCES account_categories(id),
ADD COLUMN transaction_type TEXT CHECK (transaction_type IN ('expense', 'revenue')) DEFAULT 'expense';