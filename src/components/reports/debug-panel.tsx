/**
 * iPhone用デバッグ情報表示パネル
 * ダウンロード機能のトラブルシューティング用
 */

'use client';

import { useState } from 'react';
import { detectiOSEnvironment, displayiOSDebugInfo } from '@/lib/utils/ios-download-fix';
import { detectPlatform, preflightCheck } from '@/lib/utils/universal-download';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Bug, Smartphone, Download } from 'lucide-react';

interface DebugPanelProps {
  onTestDownload?: () => void;
}

export function DebugPanel({ onTestDownload }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runDiagnostics = async () => {
    const results: string[] = [];
    
    try {
      // プラットフォーム検出テスト
      const platform = detectPlatform();
      results.push(`✅ プラットフォーム検出: ${platform.type}/${platform.browser}`);
      
      // iOS専用環境検出
      if (platform.type === 'ios') {
        const iosEnv = detectiOSEnvironment();
        results.push(`📱 iOS詳細情報:`);
        results.push(`  - iOS バージョン: ${iosEnv.iOSVersion}`);
        results.push(`  - Safari バージョン: ${iosEnv.safariVersion}`);
        results.push(`  - PWAモード: ${iosEnv.isPWA ? 'Yes' : 'No'}`);
        results.push(`  - Web Share API: ${iosEnv.capabilities.webShare ? 'Yes' : 'No'}`);
        results.push(`  - Clipboard API: ${iosEnv.capabilities.clipboardAPI ? 'Yes' : 'No'}`);
      }
      
      // プリフライトチェック
      const precheck = preflightCheck();
      if (precheck.supported) {
        results.push(`✅ ダウンロード機能: サポート済み`);
      } else {
        results.push(`❌ ダウンロード機能: 制限あり`);
        precheck.warnings.forEach(warning => {
          results.push(`  ⚠️ ${warning}`);
        });
      }
      
      // 推奨事項
      if (precheck.recommendations.length > 0) {
        results.push(`💡 推奨事項:`);
        precheck.recommendations.forEach(rec => {
          results.push(`  - ${rec}`);
        });
      }
      
      // API可用性チェック
      results.push(`🔍 API可用性チェック:`);
      results.push(`  - Blob API: ${typeof Blob !== 'undefined' ? '✅' : '❌'}`);
      results.push(`  - URL.createObjectURL: ${typeof URL?.createObjectURL === 'function' ? '✅' : '❌'}`);
      results.push(`  - navigator.share: ${typeof navigator.share === 'function' ? '✅' : '❌'}`);
      results.push(`  - navigator.clipboard: ${typeof navigator.clipboard === 'object' ? '✅' : '❌'}`);
      results.push(`  - showSaveFilePicker: ${'showSaveFilePicker' in window ? '✅' : '❌'}`);
      
    } catch (error) {
      results.push(`❌ 診断エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setTestResults(results);
  };

  const runTestDownload = async () => {
    const results: string[] = [...testResults];
    
    try {
      results.push(`\n🧪 テストダウンロード開始...`);
      
      // テスト用CSVデータ
      const testData = 'Date,Amount,Description\n2024-01-01,1000,Test Transaction';
      const testFilename = `test_download_${Date.now()}.csv`;
      
      // iOS専用ダウンロードライブラリのテスト
      const platform = detectPlatform();
      if (platform.type === 'ios') {
        const { downloadFileOnIOS } = await import('@/lib/utils/ios-download-fix');
        const result = await downloadFileOnIOS(testData, testFilename, 'text/csv;charset=utf-8');
        
        if (result.success) {
          results.push(`✅ iOS ダウンロードテスト成功`);
          results.push(`   方法: ${result.instructions ? 'ガイダンス表示' : '直接ダウンロード'}`);
          if (result.instructions) {
            results.push(`   手順数: ${result.instructions.length}`);
          }
        } else {
          results.push(`❌ iOS ダウンロードテスト失敗: ${result.message}`);
        }
      } else {
        // 通常のダウンロードテスト
        const blob = new Blob([testData], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = testFilename;
        link.click();
        URL.revokeObjectURL(url);
        
        results.push(`✅ 通常ダウンロードテスト実行完了`);
      }
      
    } catch (error) {
      results.push(`❌ テストダウンロードエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setTestResults(results);
    onTestDownload?.();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                iPhone ダウンロード診断パネル
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  iPhone でダウンロードが動作しない場合の診断とテスト機能です。
                  「診断実行」で環境情報を確認し、「テストダウンロード」で実際の動作を確認できます。
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button onClick={runDiagnostics} variant="outline" size="sm">
                  <Bug className="h-4 w-4 mr-2" />
                  診断実行
                </Button>
                <Button onClick={runTestDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  テストダウンロード
                </Button>
              </div>
              
              {testResults.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">診断結果:</h4>
                  <div className="text-sm font-mono whitespace-pre-wrap">
                    {testResults.join('\n')}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                <p>💡 <strong>トラブルシューティングのヒント:</strong></p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>iOS Safari: Web Share API または「ファイルに保存」を使用</li>
                  <li>PWAモード: ブラウザで直接開き直してテスト</li>
                  <li>プライベートブラウジング: 通常モードで再テスト</li>
                  <li>iOS 13未満: 手動でのファイル保存方法を案内</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}