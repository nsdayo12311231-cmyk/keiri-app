#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('Checking database schema...\n');

  // Test 1: Check if we can query account_categories table
  try {
    console.log('1. Testing account_categories table...');
    const { data, error } = await supabase
      .from('account_categories')
      .select('id, code, name, category_type')
      .limit(3);
    
    if (error) {
      console.error('   Error:', error.message);
    } else {
      console.log('   ✅ account_categories table exists and is accessible');
      console.log(`   Sample data (${data.length} records):`, data);
    }
  } catch (err) {
    console.error('   ❌ account_categories table error:', err.message);
  }

  // Test 2: Check transactions table with new columns
  try {
    console.log('\n2. Testing transactions table with category_id and transaction_type...');
    const { data, error } = await supabase
      .from('transactions')
      .select('id, category_id, transaction_type')
      .limit(1);
    
    if (error) {
      console.error('   Error:', error.message);
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('   ❌ The missing columns need to be added to the database');
      }
    } else {
      console.log('   ✅ transactions table with new columns is accessible');
      console.log('   Sample data:', data);
    }
  } catch (err) {
    console.error('   ❌ transactions table error:', err.message);
  }

  // Test 3: Check transactions table without new columns
  try {
    console.log('\n3. Testing basic transactions table structure...');
    const { data, error } = await supabase
      .from('transactions')
      .select('id, user_id, amount, description')
      .limit(1);
    
    if (error) {
      console.error('   Error:', error.message);
    } else {
      console.log('   ✅ Basic transactions table structure is working');
      console.log(`   Found ${data.length} transaction records (showing structure only)`);
    }
  } catch (err) {
    console.error('   ❌ Basic transactions table error:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log('To fix the missing columns, you need to run the following SQL');
  console.log('in your Supabase Dashboard > SQL Editor:');
  console.log('\n' + fs.readFileSync(path.join(__dirname, 'run-in-supabase-sql-editor.sql'), 'utf8'));
}

checkSchema().catch(console.error);