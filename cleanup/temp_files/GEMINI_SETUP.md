# GeminiAPI PDF OCR 設定手順

GeminiAPIを使った画像ベースPDF処理機能を有効にするための設定手順です。

## 1. GeminiAPI キーの取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. API キーをコピー

## 2. 環境変数の設定

`.env.local` ファイルに以下を追加：

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## 3. 必要な依存関係（オプション）

画像変換のため、以下のいずれかをインストール（オプション）：

### GraphicsMagick（推奨）
```bash
# macOS
brew install graphicsmagick

# Ubuntu/Debian
sudo apt-get install graphicsmagick

# Windows
# https://www.graphicsmagick.org/download.html からダウンロード
```

### ImageMagick（代替）
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick
```

## 4. 機能の特徴

- **画像ベースPDF対応**: スキャンされた楽天カード明細を自動読み取り
- **高精度OCR**: GeminiAPIの先進的な画像認識技術
- **自動フォールバック**: テキスト抽出失敗時に自動でGeminiAPIを使用
- **日本語対応**: 日本語の明細書を正確に処理

## 5. 処理フロー

1. PDFアップロード
2. テキスト抽出を試行
3. 失敗した場合 → 画像ベースPDFと判定
4. GeminiAPIでOCR処理を実行
5. 取引データを自動抽出・分類

## 6. トラブルシューティング

### GeminiAPI キーエラー
- `.env.local` ファイルにAPIキーが正しく設定されているか確認
- APIキーに有効期限がないか確認

### PDF変換エラー
- GraphicsMagick/ImageMagickがインストールされているか確認
- PDFファイルがパスワード保護されていないか確認

### 取引データ抽出エラー
- 楽天カードの正式な明細書PDFかどうか確認
- 明細に取引データが含まれているか確認

## 7. 対応予定の追加機能

- 他のクレジットカード明細対応（三井住友カード、PayPayカードなど）
- 銀行明細PDF対応
- より高精度な文字認識
- リアルタイム進捗表示