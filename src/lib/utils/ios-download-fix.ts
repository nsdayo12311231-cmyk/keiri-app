/**
 * iOS Safari専用ダウンロードソリューション
 * Safariの制限事項を回避してファイルダウンロードを実現
 */

interface iOSDownloadOptions {
  filename: string;
  mimeType?: string;
  showInstructions?: boolean;
  enableCopyToClipboard?: boolean;
  maxSizeForDataURL?: number; // bytes
}

interface iOSDownloadResult {
  success: boolean;
  method: 'share' | 'dataurl' | 'clipboard' | 'newtab' | 'failed';
  message?: string;
  error?: string;
  instructionSteps?: string[];
}

/**
 * iOS Safari環境の詳細検出
 */
export function detectiOSEnvironment() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
  
  // iOS バージョンの検出
  const iOSVersion = (() => {
    const match = ua.match(/OS (\d+)_(\d+)/);
    return match ? parseFloat(`${match[1]}.${match[2]}`) : 0;
  })();

  // Safari バージョンの検出
  const safariVersion = (() => {
    const match = ua.match(/Version\/(\d+\.\d+)/);
    return match ? parseFloat(match[1]) : 0;
  })();

  return {
    isIOS,
    isSafari,
    isPWA,
    iOSVersion,
    safariVersion,
    capabilities: {
      webShare: !!navigator.share && iOSVersion >= 13,
      filesAPI: 'showSaveFilePicker' in window,
      clipboardAPI: !!navigator.clipboard && iOSVersion >= 13,
      dataURL: true,
      newTabDownload: true
    }
  };
}

/**
 * iOS Safari専用の最適化されたダウンロード関数
 */
export async function downloadForIOSSafari(
  data: string | Blob | ArrayBuffer,
  options: iOSDownloadOptions
): Promise<iOSDownloadResult> {
  const env = detectiOSEnvironment();
  
  console.log('📱 iOS Safari ダウンロード開始:', {
    iOSVersion: env.iOSVersion,
    safariVersion: env.safariVersion,
    isPWA: env.isPWA,
    capabilities: env.capabilities
  });

  // データをBlobに変換
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: options.mimeType || 'application/octet-stream' });
  } else {
    // 文字列の場合、UTF-8 BOMを追加
    const content = '\uFEFF' + data;
    blob = new Blob([content], { 
      type: options.mimeType || 'text/csv;charset=utf-8' 
    });
  }

  // ファイルサイズチェック
  const maxSize = options.maxSizeForDataURL || 10 * 1024 * 1024; // 10MB default
  
  try {
    // 1. Web Share API を優先的に使用（iOS 13+）
    if (env.capabilities.webShare && blob.size < 50 * 1024 * 1024) {
      const result = await tryWebShareAPI(blob, options);
      if (result.success) return result;
    }

    // 2. データURL方式（小さなファイルの場合）
    if (blob.size <= maxSize) {
      const result = await tryDataURLDownload(blob, options, env);
      if (result.success) return result;
    }

    // 3. クリップボードコピー（テキストファイルの場合）
    if (options.enableCopyToClipboard && isTextFile(options.mimeType)) {
      const result = await tryClipboardCopy(blob, options, env);
      if (result.success) return result;
    }

    // 4. 新しいタブで開く（最終手段）
    const result = await tryNewTabMethod(blob, options);
    if (result.success) return result;

    // 全て失敗した場合
    return {
      success: false,
      method: 'failed',
      error: 'すべてのダウンロード方法が失敗しました',
      instructionSteps: getManualDownloadInstructions(options.filename)
    };

  } catch (error) {
    console.error('iOS Safari ダウンロードエラー:', error);
    return {
      success: false,
      method: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      instructionSteps: getManualDownloadInstructions(options.filename)
    };
  }
}

/**
 * Web Share API を使用したダウンロード
 */
async function tryWebShareAPI(
  blob: Blob, 
  options: iOSDownloadOptions
): Promise<iOSDownloadResult> {
  if (!navigator.share) {
    return { success: false, method: 'share', error: 'Web Share API not supported' };
  }

  try {
    const file = new File([blob], options.filename, { type: blob.type });
    
    // iOS Safari で Files を共有オプションに含める
    await navigator.share({
      files: [file],
      title: `${options.filename}`,
      text: `ファイルを保存: ${options.filename}`
    });

    return {
      success: true,
      method: 'share',
      message: 'ファイル共有メニューを開きました。「ファイルに保存」を選択してください。',
      instructionSteps: [
        '1. 共有メニューから「ファイルに保存」を選択',
        '2. 保存場所を選択（iCloud Drive推奨）',
        '3. 「保存」をタップ'
      ]
    };
  } catch (error) {
    // ユーザーがキャンセルした場合はエラーとして扱わない
    if ((error as Error).name === 'AbortError') {
      return { success: false, method: 'share', error: 'User cancelled share' };
    }
    return { success: false, method: 'share', error: `Share failed: ${error}` };
  }
}

/**
 * データURL方式でのダウンロード（改良版）
 */
async function tryDataURLDownload(
  blob: Blob,
  options: iOSDownloadOptions,
  env: ReturnType<typeof detectiOSEnvironment>
): Promise<iOSDownloadResult> {
  try {
    const dataURL = await blobToDataURL(blob);
    
    // iOS Safari 用の特別な処理
    if (env.isSafari) {
      // 新しいwindowで開いて、すぐにダウンロード属性付きリンクをクリック
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        return { success: false, method: 'dataurl', error: 'ポップアップブロック' };
      }

      // HTMLを構築してダウンロードを促す
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ファイルダウンロード - ${options.filename}</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                    margin: 20px; 
                    text-align: center;
                    background: #f5f5f7;
                }
                .download-container {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    max-width: 400px;
                    margin: 50px auto;
                }
                .download-button {
                    background: #007AFF;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    margin: 10px;
                }
                .instructions {
                    font-size: 14px;
                    color: #666;
                    margin-top: 20px;
                    text-align: left;
                }
                .instructions li {
                    margin: 8px 0;
                }
            </style>
        </head>
        <body>
            <div class="download-container">
                <h2>📄 ${options.filename}</h2>
                <p>ファイルをダウンロードします</p>
                
                <a href="${dataURL}" download="${options.filename}" class="download-button" id="downloadLink">
                    ダウンロード開始
                </a>
                
                <div class="instructions">
                    <p><strong>iPhone/iPad での保存方法:</strong></p>
                    <ol>
                        <li>上のボタンをタップ</li>
                        <li>Safari で開いたら画面下部の「共有」ボタン（□↑）をタップ</li>
                        <li>「ファイルに保存」を選択</li>
                        <li>保存場所を選んで「保存」</li>
                    </ol>
                    <p><small>※ ファイルは「ファイル」アプリで確認できます</small></p>
                </div>
            </div>
            
            <script>
                // 自動ダウンロードの試行
                setTimeout(() => {
                    document.getElementById('downloadLink').click();
                }, 1000);
                
                // 5秒後にダウンロードボタンを再度表示
                setTimeout(() => {
                    document.getElementById('downloadLink').textContent = '再ダウンロード';
                    document.getElementById('downloadLink').style.background = '#34C759';
                }, 5000);
            </script>
        </body>
        </html>
      `;

      newWindow.document.write(html);
      newWindow.document.close();

      return {
        success: true,
        method: 'dataurl',
        message: 'ダウンロードページを開きました。手順に従ってファイルを保存してください。',
        instructionSteps: [
          '1. 開いたページのボタンをタップ',
          '2. Safariの共有ボタン（□↑）をタップ', 
          '3. 「ファイルに保存」を選択',
          '4. 保存場所を選んで「保存」'
        ]
      };
    } else {
      // 通常のダウンロード処理
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = options.filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return {
        success: true,
        method: 'dataurl',
        message: 'ファイルダウンロードを開始しました'
      };
    }
  } catch (error) {
    return { 
      success: false, 
      method: 'dataurl', 
      error: `Data URL download failed: ${error}` 
    };
  }
}

/**
 * クリップボードへのコピー
 */
async function tryClipboardCopy(
  blob: Blob,
  options: iOSDownloadOptions,
  env: ReturnType<typeof detectiOSEnvironment>
): Promise<iOSDownloadResult> {
  if (!env.capabilities.clipboardAPI) {
    return { success: false, method: 'clipboard', error: 'Clipboard API not supported' };
  }

  try {
    const text = await blob.text();
    await navigator.clipboard.writeText(text);
    
    return {
      success: true,
      method: 'clipboard',
      message: `ファイル内容をクリップボードにコピーしました。メモアプリなどに貼り付けて保存してください。`,
      instructionSteps: [
        '1. メモアプリを開く',
        '2. 新しいメモを作成',
        '3. 長押しして「ペースト」を選択',
        '4. ファイル名をタイトルに設定して保存'
      ]
    };
  } catch (error) {
    return { 
      success: false, 
      method: 'clipboard', 
      error: `Clipboard copy failed: ${error}` 
    };
  }
}

/**
 * 新しいタブでの表示方法
 */
async function tryNewTabMethod(
  blob: Blob,
  options: iOSDownloadOptions
): Promise<iOSDownloadResult> {
  try {
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      return { success: false, method: 'newtab', error: 'ポップアップがブロックされました' };
    }

    // URLを少し遅れて解放
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    
    return {
      success: true,
      method: 'newtab',
      message: '新しいタブでファイルを開きました。Safari の共有機能を使って保存してください。',
      instructionSteps: [
        '1. 新しいタブに切り替え',
        '2. Safari の共有ボタン（□↑）をタップ',
        '3. 「ファイルに保存」を選択',
        '4. 保存場所を選んで保存'
      ]
    };
  } catch (error) {
    return { 
      success: false, 
      method: 'newtab', 
      error: `New tab method failed: ${error}` 
    };
  }
}

/**
 * BlobをDataURLに変換
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * テキストファイルかどうかの判定
 */
function isTextFile(mimeType?: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('text/') || 
         mimeType === 'application/json' ||
         mimeType === 'text/csv' ||
         mimeType.includes('csv');
}

/**
 * 手動ダウンロード手順の取得
 */
function getManualDownloadInstructions(filename: string): string[] {
  return [
    `【${filename} の手動保存方法】`,
    '1. このページをブックマークに追加',
    '2. Safari の「共有」ボタン（□↑）をタップ',
    '3. 「ファイルに保存」または「iCloud Drive に保存」を選択',
    '4. 保存場所を選んで「保存」をタップ',
    '5. 保存されたファイルは「ファイル」アプリで確認可能'
  ];
}

/**
 * iOS Safari用の統合ダウンロード関数（簡単インターフェース）
 */
export async function downloadFileOnIOS(
  data: string | Blob,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8'
): Promise<{ success: boolean; message: string; instructions?: string[] }> {
  const result = await downloadForIOSSafari(data, {
    filename,
    mimeType,
    showInstructions: true,
    enableCopyToClipboard: mimeType.includes('text') || mimeType.includes('csv'),
    maxSizeForDataURL: 5 * 1024 * 1024 // 5MB
  });

  return {
    success: result.success,
    message: result.message || (result.success ? 'ダウンロード完了' : 'ダウンロード失敗'),
    instructions: result.instructionSteps
  };
}

/**
 * 開発・デバッグ用の環境情報表示
 */
export function displayiOSDebugInfo(): string {
  const env = detectiOSEnvironment();
  return `
📱 iOS Safari 環境情報:
- iOS: ${env.isIOS ? 'Yes' : 'No'} (バージョン: ${env.iOSVersion})
- Safari: ${env.isSafari ? 'Yes' : 'No'} (バージョン: ${env.safariVersion})
- PWA: ${env.isPWA ? 'Yes' : 'No'}
- Web Share: ${env.capabilities.webShare ? 'Yes' : 'No'}
- Files API: ${env.capabilities.filesAPI ? 'Yes' : 'No'}
- Clipboard API: ${env.capabilities.clipboardAPI ? 'Yes' : 'No'}
- User Agent: ${navigator.userAgent}
  `.trim();
}