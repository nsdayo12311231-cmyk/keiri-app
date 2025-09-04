/**
 * レイジーローディング用のインポートヘルパー
 * バンドルサイズの最適化のため、重いライブラリを動的にインポート
 */

import { lazy } from 'react';

// Hugging Faceライブラリの動的インポート
export const loadHuggingFaceClassifier = async () => {
  const { classifyWithAI } = await import('@/lib/classification/huggingface-classifier');
  return classifyWithAI;
};

// OpenAI分類機能の動的インポート
export const loadOpenAIClassifier = async () => {
  const { classifyWithOpenAI } = await import('@/lib/classification/openai-classifier');
  return classifyWithOpenAI;
};

// PDF処理ライブラリの動的インポート
export const loadPDFParser = async () => {
  const { parsePDF } = await import('@/lib/utils/pdf-parser');
  return parsePDF;
};

// OCRライブラリの動的インポート
export const loadVisionAPI = async () => {
  const { processReceiptOCR } = await import('@/lib/ocr/vision-api');
  return processReceiptOCR;
};

// レポート生成ライブラリの動的インポート
export const loadDataExport = async () => {
  const module = await import('@/lib/utils/data-export');
  return {
    exportTransactionsToCSV: module.exportTransactionsToCSV,
    exportTransactionsToExcel: module.exportTransactionsToExcel,
    exportAllData: module.exportAllData,
  };
};

// チャートライブラリの動的インポート（将来的な使用のため）
export const loadChartLibrary = async () => {
  // 将来的にChart.jsやRechartsを使用する場合
  // const chartLib = await import('chart.js');
  // return chartLib;
  console.log('Chart library lazy loading placeholder');
};

/**
 * 条件付きコンポーネントローダー
 */
export const LazyReceiptUpload = lazy(() => 
  import('@/components/receipts/receipt-upload').then(module => ({ 
    default: module.ReceiptUpload 
  }))
);

export const LazyEnhancedPreview = lazy(() =>
  import('@/components/receipts/enhanced-preview').then(module => ({
    default: module.EnhancedPreview
  }))
);

export const LazyRealtimeProgress = lazy(() =>
  import('@/components/receipts/realtime-progress').then(module => ({
    default: module.RealtimeProgress
  }))
);

/**
 * 高重量機能のプリローダー（ユーザーの操作予測に基づく）
 */
export const preloadHeavyFeatures = {
  // レシート処理関連
  async preloadReceiptFeatures() {
    return Promise.all([
      loadHuggingFaceClassifier().catch(() => null),
      loadOpenAIClassifier().catch(() => null),
      loadVisionAPI().catch(() => null),
    ]);
  },

  // データエクスポート関連
  async preloadExportFeatures() {
    return loadDataExport().catch(() => null);
  },

  // PDFインポート関連
  async preloadPDFFeatures() {
    return loadPDFParser().catch(() => null);
  },
};

/**
 * バンドル分析用のメタデータ
 */
export const bundleMetadata = {
  heavyModules: [
    '@huggingface/transformers',
    'pdf-parse',
    '@google/generative-ai',
    'openai'
  ],
  optimizedPages: [
    '/receipts',
    '/dashboard', 
    '/reports',
    '/admin/analytics'
  ],
  lazyLoadingEnabled: true,
  preloadingStrategy: 'user-interaction-based'
};