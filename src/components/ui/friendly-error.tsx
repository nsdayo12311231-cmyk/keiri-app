'use client';

import { AlertCircle, RefreshCw, Camera, Edit, HelpCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FriendlyErrorProps {
  type: 'receipt-ocr' | 'pdf-import' | 'csv-import' | 'network' | 'validation' | 'auth' | 'general';
  title?: string;
  message?: string;
  onRetry?: () => void;
  onAlternative?: () => void;
  alternativeText?: string;
  children?: React.ReactNode;
}

const errorConfigs = {
  'receipt-ocr': {
    icon: Camera,
    defaultTitle: 'レシートの読み取りに失敗しました',
    defaultMessage: 'レシートの内容を正しく読み取れませんでした。',
    suggestions: [
      '📱 より明るい場所で再撮影してください',
      '📐 レシートを平らにして、文字がはっきり見えるように撮影',
      '🔍 レシート全体が画面内に入るように調整'
    ],
    retryText: '再撮影する',
    alternativeText: '手動で入力する'
  },
  'pdf-import': {
    icon: FileText,
    defaultTitle: 'PDFの読み込みに失敗しました',
    defaultMessage: 'PDFファイルの処理中にエラーが発生しました。',
    suggestions: [
      '📄 PDFファイルが破損していないか確認してください',
      '📏 ファイルサイズが大きすぎる場合は、分割してお試しください',
      '🔒 パスワード保護されている場合は、解除してからアップロード'
    ],
    retryText: '別のファイルを選ぶ',
    alternativeText: 'CSVで試す'
  },
  'csv-import': {
    icon: FileText,
    defaultTitle: 'CSVの読み込みに失敗しました',
    defaultMessage: 'CSVファイルの形式に問題があります。',
    suggestions: [
      '📊 CSV形式が正しいか確認してください（UTF-8エンコーディング推奨）',
      '🏦 銀行やクレジットカード会社の標準的な出力形式をご利用ください',
      '📝 必要な列（日付、金額、説明）が含まれているか確認'
    ],
    retryText: '別のファイルを選ぶ',
    alternativeText: '手動で入力する'
  },
  'network': {
    icon: RefreshCw,
    defaultTitle: 'インターネット接続に問題があります',
    defaultMessage: 'サーバーとの通信に失敗しました。',
    suggestions: [
      '🌐 インターネット接続を確認してください',
      '⏰ しばらく時間をおいて再度お試しください',
      '🔄 ページを更新してみてください'
    ],
    retryText: '再試行する',
    alternativeText: 'オフラインで作業する'
  },
  'validation': {
    icon: HelpCircle,
    defaultTitle: '入力内容に不備があります',
    defaultMessage: '必要な項目が入力されていないか、形式が正しくありません。',
    suggestions: [
      '✏️ 必須項目がすべて入力されているか確認してください',
      '💰 金額は半角数字で入力してください',
      '📅 日付は正しい形式（YYYY-MM-DD）で入力してください'
    ],
    retryText: '入力を修正する',
    alternativeText: 'ヘルプを見る'
  },
  'auth': {
    icon: AlertCircle,
    defaultTitle: 'ログインが必要です',
    defaultMessage: 'この機能を利用するにはログインが必要です。',
    suggestions: [
      '🔐 ログイン情報を確認してください',
      '⏰ セッションが切れている可能性があります',
      '🆕 新規の方はアカウント作成が必要です'
    ],
    retryText: 'ログインする',
    alternativeText: '新規登録する'
  },
  'general': {
    icon: AlertCircle,
    defaultTitle: 'エラーが発生しました',
    defaultMessage: '申し訳ありません。予期しないエラーが発生しました。',
    suggestions: [
      '🔄 ページを更新してみてください',
      '⏰ しばらく時間をおいて再度お試しください',
      '📞 問題が続く場合は、サポートにお問い合わせください'
    ],
    retryText: '再試行する',
    alternativeText: 'ホームに戻る'
  }
};

export function FriendlyError({ 
  type, 
  title, 
  message, 
  onRetry, 
  onAlternative, 
  alternativeText,
  children 
}: FriendlyErrorProps) {
  const config = errorConfigs[type];
  const Icon = config.icon;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* アイコン */}
          <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
            <Icon className="h-5 w-5 text-red-600" />
          </div>

          <div className="flex-1 min-w-0">
            {/* タイトル */}
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              {title || config.defaultTitle}
            </h3>

            {/* メッセージ */}
            <p className="text-red-700 text-sm mb-4">
              {message || config.defaultMessage}
            </p>

            {/* カスタムコンテンツ */}
            {children && (
              <div className="mb-4">
                {children}
              </div>
            )}

            {/* 解決策の提案 */}
            <div className="bg-white/50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-red-800 mb-3">💡 解決方法をお試しください:</h4>
              <ul className="space-y-2">
                {config.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-xs text-red-700 flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span className="flex-1">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col sm:flex-row gap-2">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  className="bg-white border-red-300 text-red-700 hover:bg-red-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {config.retryText}
                </Button>
              )}
              
              {onAlternative && (
                <Button
                  onClick={onAlternative}
                  variant="secondary"
                  size="sm"
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {alternativeText || config.alternativeText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}