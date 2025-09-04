#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// Create Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeSQL(sql) {
  console.log('Executing SQL:', sql.substring(0, 100) + '...');
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error('SQL Error:', error);
      return { success: false, error };
    }
    
    console.log('SQL executed successfully');
    return { success: true, data };
  } catch (err) {
    console.error('Execution error:', err);
    return { success: false, error: err };
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
      
    return !error;
  } catch (err) {
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const { data, error } = await supabase.rpc('check_column_exists', {
      table_name: tableName,
      column_name: columnName
    });
    
    return !error && data;
  } catch (err) {
    // Fallback: try to select the column
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select(columnName)
        .limit(0);
      return !error;
    } catch (fallbackErr) {
      return false;
    }
  }
}

async function main() {
  console.log('Starting database schema update...\n');

  // Step 1: Check if account_categories table exists
  console.log('1. Checking if account_categories table exists...');
  const categoriesTableExists = await checkTableExists('account_categories');
  console.log(`   account_categories table exists: ${categoriesTableExists}\n`);

  // Step 2: Create account_categories table if it doesn't exist
  if (!categoriesTableExists) {
    console.log('2. Creating account_categories table...');
    const createTableSQL = `
      CREATE TABLE account_categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category_type TEXT NOT NULL CHECK (category_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
        is_business BOOLEAN DEFAULT TRUE,
        parent_id UUID REFERENCES account_categories(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
      );
    `;
    
    const result = await executeSQL(createTableSQL);
    if (!result.success) {
      console.error('Failed to create account_categories table');
      process.exit(1);
    }
    console.log('   account_categories table created successfully\n');
  } else {
    console.log('2. account_categories table already exists, skipping creation\n');
  }

  // Step 3: Check if transactions table has the required columns
  console.log('3. Checking transactions table columns...');
  const transactionsExists = await checkTableExists('transactions');
  console.log(`   transactions table exists: ${transactionsExists}`);
  
  if (!transactionsExists) {
    console.error('   transactions table does not exist! Please run the initial schema first.');
    process.exit(1);
  }

  // Check for category_id column
  const categoryIdExists = await checkColumnExists('transactions', 'category_id');
  console.log(`   category_id column exists: ${categoryIdExists}`);

  // Check for transaction_type column  
  const transactionTypeExists = await checkColumnExists('transactions', 'transaction_type');
  console.log(`   transaction_type column exists: ${transactionTypeExists}\n`);

  // Step 4: Add missing columns to transactions table
  let alterSQL = '';
  if (!categoryIdExists && !transactionTypeExists) {
    console.log('4. Adding both category_id and transaction_type columns...');
    alterSQL = `
      ALTER TABLE transactions 
      ADD COLUMN category_id UUID REFERENCES account_categories(id),
      ADD COLUMN transaction_type TEXT CHECK (transaction_type IN ('expense', 'revenue')) DEFAULT 'expense';
    `;
  } else if (!categoryIdExists) {
    console.log('4. Adding category_id column...');
    alterSQL = `
      ALTER TABLE transactions 
      ADD COLUMN category_id UUID REFERENCES account_categories(id);
    `;
  } else if (!transactionTypeExists) {
    console.log('4. Adding transaction_type column...');
    alterSQL = `
      ALTER TABLE transactions 
      ADD COLUMN transaction_type TEXT CHECK (transaction_type IN ('expense', 'revenue')) DEFAULT 'expense';
    `;
  } else {
    console.log('4. All required columns exist, skipping column additions\n');
  }

  if (alterSQL) {
    const result = await executeSQL(alterSQL);
    if (!result.success) {
      console.error('Failed to add columns to transactions table');
      process.exit(1);
    }
    console.log('   Columns added successfully\n');
  }

  // Step 5: Insert seed data for account categories
  console.log('5. Inserting seed data for account categories...');
  
  // Check if data already exists
  try {
    const { data: existingData } = await supabase
      .from('account_categories')
      .select('id')
      .limit(1);
    
    if (existingData && existingData.length > 0) {
      console.log('   Seed data already exists, skipping insertion\n');
    } else {
      const seedDataSQL = `
        INSERT INTO account_categories (code, name, category_type, is_business) VALUES
        -- 資産 (Asset)
        ('100', '現金', 'asset', true),
        ('101', '普通預金', 'asset', true),
        ('102', '売掛金', 'asset', true),

        -- 費用 (Expense) - 事業用
        ('501', '仕入費', 'expense', true),
        ('502', '外注費', 'expense', true),
        ('503', '広告宣伝費', 'expense', true),
        ('504', '旅費交通費', 'expense', true),
        ('505', '通信費', 'expense', true),
        ('506', '水道光熱費', 'expense', true),
        ('507', '地代家賃', 'expense', true),
        ('508', '消耗品費', 'expense', true),
        ('509', '福利厚生費', 'expense', true),
        ('510', '会議費', 'expense', true),
        ('511', '接待交際費', 'expense', true),
        ('512', '減価償却費', 'expense', true),
        ('513', '租税公課', 'expense', true),
        ('514', '支払手数料', 'expense', true),
        ('515', '雑費', 'expense', true),

        -- 収益 (Revenue) - 事業用
        ('401', '売上高', 'revenue', true),
        ('402', 'サービス売上', 'revenue', true),
        ('403', '雑収入', 'revenue', true),

        -- 個人用費用
        ('601', '食費', 'expense', false),
        ('602', '住居費', 'expense', false),
        ('603', '交通費', 'expense', false),
        ('604', '娯楽費', 'expense', false),
        ('605', '被服費', 'expense', false),
        ('606', '医療費', 'expense', false),
        ('607', '教育費', 'expense', false),
        ('608', 'その他個人支出', 'expense', false)

        ON CONFLICT (code) DO NOTHING;
      `;
      
      const result = await executeSQL(seedDataSQL);
      if (!result.success) {
        console.error('Failed to insert seed data');
        process.exit(1);
      }
      console.log('   Seed data inserted successfully\n');
    }
  } catch (err) {
    console.error('Error checking/inserting seed data:', err);
  }

  // Step 6: Verify the schema update
  console.log('6. Verifying schema updates...');
  try {
    const { data: categories, error: catError } = await supabase
      .from('account_categories')
      .select('code, name, category_type')
      .limit(5);
    
    if (catError) {
      console.error('   Error querying account_categories:', catError);
    } else {
      console.log(`   account_categories table has ${categories.length} sample records`);
    }

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id, category_id, transaction_type')
      .limit(1);
    
    if (transError) {
      console.error('   Error querying transactions with new columns:', transError);
    } else {
      console.log('   transactions table can be queried with new columns successfully');
    }
    
  } catch (err) {
    console.error('   Verification error:', err);
  }

  console.log('\nDatabase schema update completed successfully! 🎉');
}

main().catch(console.error);