/**
 * 統一クロスプラットフォーム対応ダウンロードライブラリ
 * PC・スマホ・タブレット環境でのファイルダウンロードの互換性を保証
 */

export interface PlatformInfo {
  type: 'desktop' | 'ios' | 'android' | 'mobile';
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'unknown';
  isStandalone: boolean; // PWAモード
}

export interface DownloadOptions {
  filename: string;
  mimeType?: string;
  showSuccessMessage?: boolean;
  timeout?: number; // ミリ秒
  fallbackToNewTab?: boolean; // ダウンロード失敗時に新しいタブで開く
}

export interface DownloadResult {
  success: boolean;
  platform: PlatformInfo;
  method: 'download' | 'newtab' | 'share' | 'copy';
  message?: string;
  error?: string;
}

/**
 * プラットフォーム情報の取得
 */
export function detectPlatform(): PlatformInfo {
  const ua = navigator.userAgent.toLowerCase();
  
  // ブラウザ検出
  let browser: PlatformInfo['browser'] = 'unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('edg')) browser = 'edge';
  
  // デバイス検出
  let type: PlatformInfo['type'] = 'desktop';
  if (/iphone|ipad|ipod/.test(ua)) type = 'ios';
  else if (/android/.test(ua)) type = 'android';
  else if (/mobile|tablet/.test(ua)) type = 'mobile';
  
  // PWA検出
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  return { type, browser, isStandalone };
}

/**
 * プラットフォーム固有の制限事項チェック
 */
function checkPlatformLimitations(platform: PlatformInfo): {
  canDownload: boolean;
  needsFallback: boolean;
  limitations: string[];
} {
  const limitations: string[] = [];
  let canDownload = true;
  let needsFallback = false;

  switch (platform.type) {
    case 'ios':
      if (platform.browser === 'safari') {
        limitations.push('Safari iOS: 同時ダウンロード制限あり');
      }
      if (platform.isStandalone) {
        limitations.push('iOS PWA: ダウンロード時に Safari に切り替わる場合あり');
        needsFallback = true;
      }
      break;
      
    case 'android':
      if (platform.isStandalone) {
        limitations.push('Android PWA: デフォルトブラウザが開く場合あり');
      }
      break;
      
    case 'mobile':
      limitations.push('モバイル環境: ファイル管理機能が制限される場合あり');
      needsFallback = true;
      break;
  }

  return { canDownload, needsFallback, limitations };
}

/**
 * 統一ダウンロード関数 - メイン関数
 */
export async function universalDownload(
  data: string | Blob | ArrayBuffer,
  options: DownloadOptions
): Promise<DownloadResult> {
  const platform = detectPlatform();
  const { canDownload, needsFallback, limitations } = checkPlatformLimitations(platform);
  
  console.log(`📱 ダウンロード開始: ${platform.type}/${platform.browser}`, { limitations });
  
  // データをBlobに変換
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: options.mimeType || 'application/octet-stream' });
  } else {
    // 文字列の場合、UTF-8 BOMを追加（日本語対応）
    const content = typeof data === 'string' ? '\uFEFF' + data : data;
    blob = new Blob([content], { 
      type: options.mimeType || 'text/plain;charset=utf-8' 
    });
  }

  // プラットフォーム別処理選択
  try {
    let result: DownloadResult;
    
    switch (platform.type) {
      case 'ios':
        result = await downloadForIOS(blob, options, platform);
        break;
      case 'android':
        result = await downloadForAndroid(blob, options, platform);
        break;
      default:
        result = await downloadForDesktop(blob, options, platform);
    }

    // フォールバック処理
    if (!result.success && (needsFallback || options.fallbackToNewTab)) {
      console.log('⚠️ メインダウンロード失敗、フォールバック実行');
      result = await downloadFallback(blob, options, platform);
    }

    // 成功メッセージ表示
    if (result.success && options.showSuccessMessage) {
      showPlatformSpecificMessage(platform, options.filename);
    }

    return result;
    
  } catch (error) {
    console.error('❌ ダウンロードエラー:', error);
    return {
      success: false,
      platform,
      method: 'download',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * iOS向けダウンロード処理
 */
async function downloadForIOS(
  blob: Blob, 
  options: DownloadOptions, 
  platform: PlatformInfo
): Promise<DownloadResult> {
  try {
    // iOS 13+ では Web Share API が利用可能
    if (navigator.share && blob.size < 50 * 1024 * 1024) { // 50MB制限
      const file = new File([blob], options.filename, { type: blob.type });
      
      try {
        await navigator.share({
          files: [file],
          title: `${options.filename} をダウンロード`
        });
        
        return {
          success: true,
          platform,
          method: 'share',
          message: 'ファイル共有経由でダウンロード完了'
        };
      } catch (shareError) {
        console.log('ℹ️ Web Share API 使用不可、従来方法にフォールバック');
      }
    }

    // 従来のダウンロード方法
    return await standardDownload(blob, options, platform);
    
  } catch (error) {
    throw new Error(`iOS ダウンロードエラー: ${error}`);
  }
}

/**
 * Android向けダウンロード処理
 */
async function downloadForAndroid(
  blob: Blob, 
  options: DownloadOptions, 
  platform: PlatformInfo
): Promise<DownloadResult> {
  try {
    // Android Chrome は標準ダウンロードが最適
    const result = await standardDownload(blob, options, platform);
    
    if (result.success) {
      return {
        ...result,
        message: 'Android ダウンロードフォルダに保存されました'
      };
    }
    
    return result;
    
  } catch (error) {
    throw new Error(`Android ダウンロードエラー: ${error}`);
  }
}

/**
 * デスクトップ向けダウンロード処理
 */
async function downloadForDesktop(
  blob: Blob, 
  options: DownloadOptions, 
  platform: PlatformInfo
): Promise<DownloadResult> {
  try {
    return await standardDownload(blob, options, platform);
  } catch (error) {
    throw new Error(`デスクトップ ダウンロードエラー: ${error}`);
  }
}

/**
 * 標準ダウンロード処理（全プラットフォーム共通）
 */
async function standardDownload(
  blob: Blob, 
  options: DownloadOptions, 
  platform: PlatformInfo
): Promise<DownloadResult> {
  
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = options.filename;
      
      // iOS Safari での確実な実行を保証
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // タイムアウト設定
      const timeout = setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        reject(new Error('ダウンロードがタイムアウトしました'));
      }, options.timeout || 30000);
      
      // クリックイベント
      link.addEventListener('click', () => {
        clearTimeout(timeout);
        // 少し待ってからクリーンアップ
        setTimeout(() => {
          try {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (e) {
            // クリーンアップエラーは無視
          }
        }, 1000);
        
        resolve({
          success: true,
          platform,
          method: 'download',
          message: 'ダウンロードを開始しました'
        });
      });
      
      // 強制クリック実行
      link.click();
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * フォールバック処理（新しいタブで開く）
 */
async function downloadFallback(
  blob: Blob, 
  options: DownloadOptions, 
  platform: PlatformInfo
): Promise<DownloadResult> {
  try {
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
      // ファイルが開けたらURL解放
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      return {
        success: true,
        platform,
        method: 'newtab',
        message: '新しいタブでファイルを開きました'
      };
    } else {
      throw new Error('新しいタブを開けませんでした（ポップアップブロック）');
    }
  } catch (error) {
    throw new Error(`フォールバック処理エラー: ${error}`);
  }
}

/**
 * プラットフォーム固有の成功メッセージ表示
 */
function showPlatformSpecificMessage(platform: PlatformInfo, filename: string): void {
  let message = '';
  
  switch (platform.type) {
    case 'ios':
      message = `📱 iOS: 「ファイル」アプリ → 「ダウンロード」で確認できます\n📄 ファイル名: ${filename}`;
      break;
    case 'android':
      message = `📱 Android: ダウンロードフォルダに保存されました\n📄 ファイル名: ${filename}`;
      break;
    default:
      message = `💻 ダウンロードフォルダに保存されました\n📄 ファイル名: ${filename}`;
  }
  
  // Toast通知やアラートで表示（実装は呼び出し側で調整）
  console.log(`✅ ダウンロード完了: ${message}`);
}

/**
 * プリフライトチェック - ダウンロード前の環境確認
 */
export function preflightCheck(): {
  supported: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const platform = detectPlatform();
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let supported = true;

  // 基本API確認
  if (!window.Blob) {
    warnings.push('Blob API が利用できません');
    supported = false;
  }
  
  if (!window.URL?.createObjectURL) {
    warnings.push('URL.createObjectURL が利用できません');
    supported = false;
  }

  // プラットフォーム固有の推奨事項
  switch (platform.type) {
    case 'ios':
      if (platform.browser === 'safari') {
        recommendations.push('複数ファイルの同時ダウンロードは避けてください');
      }
      if (platform.isStandalone) {
        recommendations.push('PWAモード: ダウンロード時にブラウザが開く場合があります');
      }
      break;
      
    case 'android':
      recommendations.push('ダウンロードフォルダの確認をお勧めします');
      break;
      
    default:
      recommendations.push('最適な環境で動作しています');
  }

  return { supported, warnings, recommendations };
}

/**
 * ダウンロード統計情報の取得
 */
export function getDownloadCapabilities(): {
  platform: PlatformInfo;
  maxFileSize: number; // bytes
  supportedFormats: string[];
  hasShareAPI: boolean;
  hasFileSystemAPI: boolean;
} {
  const platform = detectPlatform();
  
  // プラットフォーム別制限
  let maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB (デスクトップ)
  
  if (platform.type === 'ios' || platform.type === 'android') {
    maxFileSize = 100 * 1024 * 1024; // 100MB (モバイル)
  }
  
  return {
    platform,
    maxFileSize,
    supportedFormats: [
      'text/csv',
      'application/json', 
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ],
    hasShareAPI: !!navigator.share,
    hasFileSystemAPI: 'showSaveFilePicker' in window
  };
}

/**
 * バッチダウンロード（複数ファイルの連続ダウンロード）
 */
export async function batchDownload(
  files: Array<{ data: string | Blob | ArrayBuffer; filename: string; mimeType?: string }>,
  options: { 
    interval?: number; // ファイル間の間隔（ミリ秒）
    onProgress?: (index: number, total: number, filename: string) => void;
    onError?: (index: number, filename: string, error: string) => void;
  } = {}
): Promise<DownloadResult[]> {
  const platform = detectPlatform();
  const results: DownloadResult[] = [];
  const interval = options.interval || (platform.type === 'ios' ? 1000 : 300);
  
  console.log(`📦 バッチダウンロード開始: ${files.length}ファイル`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      options.onProgress?.(i + 1, files.length, file.filename);
      
      const result = await universalDownload(file.data, {
        filename: file.filename,
        mimeType: file.mimeType,
        showSuccessMessage: false, // バッチ処理中は個別メッセージは不要
        timeout: 30000
      });
      
      results.push(result);
      
      if (!result.success) {
        options.onError?.(i, file.filename, result.error || 'Unknown error');
      }
      
      // 間隔を空けて次のファイル
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      options.onError?.(i, file.filename, errorMessage);
      
      results.push({
        success: false,
        platform,
        method: 'download',
        error: errorMessage
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ バッチダウンロード完了: ${successCount}/${files.length}ファイル成功`);
  
  return results;
}