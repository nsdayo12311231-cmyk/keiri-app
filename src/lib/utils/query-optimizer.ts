/**
 * データベースクエリ最適化ライブラリ
 * Supabaseクエリのパフォーマンス向上とキャッシュ機能
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * クエリキャッシュマネージャー
 */
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 5分のデフォルトTTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  invalidate(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  
  getSize() {
    return this.cache.size;
  }
}

export const queryCache = new QueryCache();

/**
 * 最適化されたクエリ関数群
 */
export class DatabaseOptimizer {
  constructor(private supabase: SupabaseClientType) {}

  /**
   * ページネーション付きトランザクション取得（最適化版）
   */
  async getTransactionsPaginated(
    userId: string,
    options: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
      isBusinessOnly?: boolean;
      confirmedOnly?: boolean;
      categoryId?: string;
    } = {}
  ) {
    const {
      page = 1,
      pageSize = 50,
      startDate,
      endDate,
      isBusinessOnly,
      confirmedOnly,
      categoryId
    } = options;

    const cacheKey = `transactions:${userId}:${JSON.stringify(options)}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const offset = (page - 1) * pageSize;

    let query = this.supabase
      .from('transactions')
      .select(`
        id,
        amount,
        description,
        transaction_date,
        is_business,
        is_confirmed,
        category_id,
        account_categories!inner (
          name,
          code,
          category_type
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // フィルター条件の追加
    if (startDate) query = query.gte('transaction_date', startDate);
    if (endDate) query = query.lte('transaction_date', endDate);
    if (isBusinessOnly) query = query.eq('is_business', true);
    if (confirmedOnly) query = query.eq('is_confirmed', true);
    if (categoryId) query = query.eq('category_id', categoryId);

    const result = await query;
    
    if (!result.error) {
      queryCache.set(cacheKey, result, 2 * 60 * 1000); // 2分キャッシュ
    }
    
    return result;
  }

  /**
   * ダッシュボード統計の最適化取得
   */
  async getDashboardStats(userId: string, dateRange?: { start: string; end: string }) {
    const cacheKey = `dashboard:${userId}:${dateRange ? `${dateRange.start}-${dateRange.end}` : 'all'}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    let query = this.supabase
      .from('transactions')
      .select('amount, is_business, is_confirmed, transaction_type')
      .eq('user_id', userId);

    if (dateRange) {
      query = query
        .gte('transaction_date', dateRange.start)
        .lte('transaction_date', dateRange.end);
    }

    const { data, error } = await query;
    
    if (error) return { data: null, error };

    // クライアントサイドで集計（DBの負荷軽減）
    const stats = data?.reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      const isRevenue = transaction.transaction_type === 'revenue' || amount > 0;
      
      if (isRevenue) {
        acc.totalRevenue += amount;
        if (transaction.is_business) acc.businessRevenue += amount;
        else acc.personalRevenue += amount;
      } else {
        const expenseAmount = Math.abs(amount);
        acc.totalExpenses += expenseAmount;
        if (transaction.is_business) acc.businessExpenses += expenseAmount;
        else acc.personalExpenses += expenseAmount;
      }
      
      if (transaction.is_confirmed) acc.confirmedCount++;
      else acc.unconfirmedCount++;
      
      return acc;
    }, {
      totalRevenue: 0,
      totalExpenses: 0,
      businessRevenue: 0,
      businessExpenses: 0,
      personalRevenue: 0,
      personalExpenses: 0,
      confirmedCount: 0,
      unconfirmedCount: 0,
    });

    const result = { data: stats, error: null };
    queryCache.set(cacheKey, result, 10 * 60 * 1000); // 10分キャッシュ
    
    return result;
  }

  /**
   * レシートデータの最適化取得
   */
  async getReceiptsOptimized(
    userId: string,
    options: {
      limit?: number;
      onlyProcessed?: boolean;
      sortBy?: 'date' | 'amount' | 'created';
    } = {}
  ) {
    const { limit = 100, onlyProcessed = false, sortBy = 'created' } = options;
    const cacheKey = `receipts:${userId}:${JSON.stringify(options)}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    let query = this.supabase
      .from('receipts')
      .select(`
        id,
        filename,
        upload_date,
        processing_status,
        extracted_data,
        image_url,
        ai_confidence
      `)
      .eq('user_id', userId)
      .limit(limit);

    // 並び順の設定
    switch (sortBy) {
      case 'date':
        query = query.order('upload_date', { ascending: false });
        break;
      case 'amount':
        query = query.order('ai_confidence', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    if (onlyProcessed) {
      query = query.eq('processing_status', 'completed');
    }

    const result = await query;
    
    if (!result.error) {
      queryCache.set(cacheKey, result, 5 * 60 * 1000); // 5分キャッシュ
    }
    
    return result;
  }

  /**
   * バルクインサート最適化
   */
  async bulkInsertTransactions(
    userId: string,
    transactions: Array<{
      amount: number;
      description: string;
      transaction_date: string;
      transaction_type: 'revenue' | 'expense';
      category_id?: string;
      is_business: boolean;
      confidence_score: number;
      metadata?: any;
    }>
  ) {
    // キャッシュの無効化（新しいデータが追加されるため）
    queryCache.invalidate(`transactions:${userId}`);
    queryCache.invalidate(`dashboard:${userId}`);

    // バッチサイズでの分割処理（Supabaseの制限対策）
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize).map(tx => ({
        ...tx,
        user_id: userId,
        account_id: null,
        is_confirmed: false,
        external_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const result = await this.supabase
        .from('transactions')
        .insert(batch)
        .select('id, transaction_date, description, amount');

      results.push(result);
      
      if (result.error) {
        console.error(`Batch ${i / batchSize + 1} failed:`, result.error);
        break;
      }
    }

    return results;
  }

  /**
   * インデックス使用状況の分析用クエリ
   */
  async analyzeQueryPerformance() {
    // 実際の本番環境では EXPLAIN ANALYZE を使用
    console.log('Query performance analysis would be run here');
    
    return {
      recommendations: [
        'user_id, transaction_date にインデックス追加を検討',
        'is_business, is_confirmed の複合インデックスを検討',
        'category_id での頻繁な検索がある場合はインデックス追加'
      ],
      cacheStats: {
        size: queryCache.getSize(),
        hitRate: 'キャッシュヒット率の計算が必要'
      }
    };
  }
}

/**
 * リアルタイムサブスクリプション最適化
 */
export class RealtimeOptimizer {
  private subscriptions = new Map<string, any>();

  constructor(private supabase: SupabaseClientType) {}

  /**
   * 効率的なリアルタイム更新の設定
   */
  subscribeToUserTransactions(
    userId: string,
    callback: (payload: any) => void,
    options: { debounceMs?: number } = {}
  ) {
    const { debounceMs = 1000 } = options;
    const subscriptionKey = `user_transactions_${userId}`;
    
    // 既存のサブスクリプションがある場合は削除
    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.get(subscriptionKey).unsubscribe();
    }

    // デバウンス機能付きコールバック
    let timeoutId: NodeJS.Timeout;
    const debouncedCallback = (payload: any) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // キャッシュの無効化
        queryCache.invalidate(`transactions:${userId}`);
        queryCache.invalidate(`dashboard:${userId}`);
        callback(payload);
      }, debounceMs);
    };

    const subscription = this.supabase
      .channel(`user_transactions_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      }, debouncedCallback)
      .subscribe();

    this.subscriptions.set(subscriptionKey, subscription);
    
    return subscription;
  }

  /**
   * 全サブスクリプションのクリーンアップ
   */
  unsubscribeAll() {
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
  }
}

/**
 * ヘルパー関数
 */
export const createOptimizedClient = (supabase: SupabaseClientType) => {
  return {
    db: new DatabaseOptimizer(supabase),
    realtime: new RealtimeOptimizer(supabase),
    cache: queryCache
  };
};

/**
 * パフォーマンス監視
 */
export const performanceMonitor = {
  async measureQueryTime<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await queryFn();
      const end = performance.now();
      console.log(`Query "${queryName}" took ${end - start} ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`Query "${queryName}" failed after ${end - start} ms:`, error);
      throw error;
    }
  },

  logCacheStats() {
    console.log('Cache size:', queryCache.getSize());
  }
};