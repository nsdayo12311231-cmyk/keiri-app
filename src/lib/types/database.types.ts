export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          account_type: 'bank' | 'credit_card' | 'ec_site' | 'digital_wallet' | 'crypto_exchange';
          account_name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_type: 'bank' | 'credit_card' | 'ec_site' | 'digital_wallet' | 'crypto_exchange';
          account_name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_type?: 'bank' | 'credit_card' | 'ec_site' | 'digital_wallet' | 'crypto_exchange';
          account_name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          amount: number;
          description: string;
          transaction_date: string;
          transaction_type: 'expense' | 'revenue';
          category_id: string | null;
          merchant_name?: string;
          is_business: boolean;
          is_confirmed: boolean;
          confidence_score?: number;
          external_id?: string | null;
          metadata?: any;
          image_url?: string;
          ocr_text?: string;
          ai_confidence?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          amount: number;
          description: string;
          transaction_date: string;
          transaction_type?: 'expense' | 'revenue';
          category_id?: string | null;
          merchant_name?: string;
          is_business?: boolean;
          is_confirmed?: boolean;
          confidence_score?: number;
          external_id?: string | null;
          metadata?: any;
          image_url?: string;
          ocr_text?: string;
          ai_confidence?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          amount?: number;
          description?: string;
          transaction_date?: string;
          transaction_type?: 'expense' | 'revenue';
          category_id?: string | null;
          merchant_name?: string;
          is_business?: boolean;
          is_confirmed?: boolean;
          confidence_score?: number;
          external_id?: string | null;
          metadata?: any;
          image_url?: string;
          ocr_text?: string;
          ai_confidence?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          debit_account: string;
          credit_account: string;
          amount: number;
          confidence_score: number;
          is_confirmed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          debit_account: string;
          credit_account: string;
          amount: number;
          confidence_score?: number;
          is_confirmed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          debit_account?: string;
          credit_account?: string;
          amount?: number;
          confidence_score?: number;
          is_confirmed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      account_categories: {
        Row: {
          id: string;
          name: string;
          category_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category_type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
          created_at?: string;
          updated_at?: string;
        };
      };
      pdf_imports: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          file_size: number;
          processing_method: 'pdf2json' | 'pdf-parse' | 'ocr' | 'gemini-ocr' | 'improved-pdf-parse';
          status: 'processing' | 'completed' | 'failed';
          transactions_count: number;
          error_message?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          file_size: number;
          processing_method?: 'pdf2json' | 'pdf-parse' | 'ocr' | 'gemini-ocr' | 'improved-pdf-parse';
          status?: 'processing' | 'completed' | 'failed';
          transactions_count?: number;
          error_message?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          file_size?: number;
          processing_method?: 'pdf2json' | 'pdf-parse' | 'ocr' | 'gemini-ocr' | 'improved-pdf-parse';
          status?: 'processing' | 'completed' | 'failed';
          transactions_count?: number;
          error_message?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      receipts: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          original_filename: string;
          image_url?: string;
          ocr_text: string;
          extracted_data: any;
          upload_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          original_filename: string;
          image_url?: string;
          ocr_text: string;
          extracted_data: any;
          upload_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          original_filename?: string;
          image_url?: string;
          ocr_text?: string;
          extracted_data?: any;
          upload_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      journal_entry_lines: {
        Row: {
          id: string;
          journal_entry_id: string;
          account_id: string;
          debit_amount: number;
          credit_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          journal_entry_id: string;
          account_id: string;
          debit_amount?: number;
          credit_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          journal_entry_id?: string;
          account_id?: string;
          debit_amount?: number;
          credit_amount?: number;
          created_at?: string;
        };
      };
      user_rules: {
        Row: {
          id: string;
          user_id: string;
          rule_name: string;
          conditions: any;
          actions: any;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rule_name: string;
          conditions: any;
          actions: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rule_name?: string;
          conditions?: any;
          actions?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_profiles: {
        Row: {
          id: string;
          user_id: string;
          detailed_business_type: string;
          major_industry_category: string;
          sub_industry_category: string;
          specializations: string[];
          work_location_type: string;
          has_employees: boolean;
          client_types: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          detailed_business_type: string;
          major_industry_category: string;
          sub_industry_category: string;
          specializations?: string[];
          work_location_type: string;
          has_employees?: boolean;
          client_types?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          detailed_business_type?: string;
          major_industry_category?: string;
          sub_industry_category?: string;
          specializations?: string[];
          work_location_type?: string;
          has_employees?: boolean;
          client_types?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      expense_policies: {
        Row: {
          id: string;
          user_id: string;
          own_car_usage: string;
          car_business_ratio: number;
          public_transport_default: string;
          meal_default: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          own_car_usage?: string;
          car_business_ratio?: number;
          public_transport_default?: string;
          meal_default?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          own_car_usage?: string;
          car_business_ratio?: number;
          public_transport_default?: string;
          meal_default?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          business_type: string;
          tax_year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          business_type?: string;
          tax_year?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          business_type?: string;
          tax_year?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}