# Keiri App 開発・修正手順書

## プロジェクト概要
**Keiri App** - Next.js 15.5.0 + TypeScript + Supabase を使用した日本の個人事業主向け経費管理アプリケーション

---

## 1. 初期問題の特定と解決

### 1.1 本番環境エラーの調査
**問題**: 本番環境（keiri-app.vercel.app）でコンソールエラーが大量発生

**調査方法**:
```bash
# 本番環境のコンソールエラーを確認
# Chrome DevTools → Console で以下のエラーを確認
- 404エラー（存在しないページへのアクセス）
- 400 Bad Request（Supabaseクエリエラー）
- API Error 500（サーバーエラー）
```

### 1.2 データベーススキーマの不整合修正

**問題**: コードとデータベーススキーマの不一致
- コード側：`category` フィールドを参照
- DB側：`category_id` フィールドが実際の構造

**修正ファイル**:
1. `/src/app/api/transactions/bulk/route.ts`
2. `/src/lib/types/database.types.ts`
3. `/src/app/reports/balance-sheet/page.tsx`

**修正例**:
```typescript
// Before
const { data: transactions, error } = await supabase
  .from('transactions')
  .select('*, category') // ❌ 存在しないフィールド

// After  
const { data: transactions, error } = await supabase
  .from('transactions')
  .select('*, category_id') // ✅ 正しいフィールド
```

### 1.3 関数インポートエラーの修正

**問題**: 未定義関数の呼び出し
```typescript
// Before
const supabase = await createServerClient(); // ❌ 関数が存在しない

// After
const supabase = await createAuthenticatedServerClient(); // ✅ 正しい関数
```

---

## 2. 404エラーの解決

### 2.1 不足しているページファイルの作成

**問題**: 設定画面から参照されている4つのページが存在しない

**作成したページ**:
1. `/src/app/profile/tax/page.tsx` - 税務・申告設定
2. `/src/app/settings/security/page.tsx` - セキュリティ設定  
3. `/src/app/settings/notifications/page.tsx` - 通知設定
4. `/src/app/settings/appearance/page.tsx` - 表示設定

**各ページの基本構造**:
```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
// その他のコンポーネントimport

export default function PageName() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ページコンテンツ */}
    </div>
  );
}
```

---

## 3. UI/UX改善

### 3.1 ロゴクリック動作の修正

**問題**: ロゴをクリックするとランディングページ（/）に遷移していた

**修正箇所**:
- `/src/components/layout/sidebar.tsx`
- `/src/components/layout/header.tsx`

```typescript
// Before
<Link href="/" className="flex items-center space-x-2">

// After
<Link href="/dashboard" className="flex items-center space-x-2">
```

### 3.2 サイドバーにユーザーメニュー追加

**追加機能**:
- ユーザー情報表示（動的）
- 設定ページへのショートカット
- ログアウトボタン

```typescript
// サイドバー下部に追加
<div className="flex-shrink-0 border-t border-border p-4">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center space-x-3">
      <div className="p-2 rounded-lg bg-primary/10">
        <User className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {user?.email?.split('@')[0] || 'ユーザー'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {user?.email || 'user@example.com'}
        </p>
      </div>
    </div>
  </div>
  
  <div className="space-y-2">
    <Button variant="outline" size="sm" asChild className="w-full justify-start">
      <Link href="/settings">
        <Settings className="mr-2 h-4 w-4" />
        設定
      </Link>
    </Button>
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleLogout}
      className="w-full justify-start text-red-600"
    >
      <LogOut className="mr-2 h-4 w-4" />
      ログアウト
    </Button>
  </div>
</div>
```

---

## 4. 認証システムの修正

### 4.1 認証状態チェックの強化

**問題**: 未認証でもダッシュボードコンテンツが表示されていた

**修正内容**:
```typescript
// ダッシュボードページ（/src/app/dashboard/page.tsx）
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  );
}

if (!user) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">認証が必要です</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}
```

### 4.2 サイドバーの認証連動

**修正内容**:
```typescript
// /src/components/layout/sidebar.tsx
export function Sidebar({ className }: SidebarProps) {
  const { user, loading } = useAuth();
  
  // 未ログイン時はサイドバーを表示しない
  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }
  
  // 以下、認証済みユーザーのみに表示されるコンテンツ
}
```

### 4.3 共通認証ガードコンポーネント作成

**ファイル**: `/src/components/auth/AuthGuard.tsx`

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return fallback || <LoadingScreen />;
  }

  if (!user) {
    return fallback || <AuthRequiredScreen />;
  }

  return <>{children}</>;
}
```

---

## 5. ヘッダーの認証状態連動

### 5.1 問題点
ログイン済みでも「ログイン」「新規登録」ボタンが表示されていた

### 5.2 修正内容

**デスクトップ版**:
```typescript
<div className="hidden md:flex items-center space-x-4">
  {loading ? (
    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
  ) : user ? (
    <>
      <div className="flex items-center space-x-3">
        <div className="text-sm text-right">
          <p className="font-medium text-foreground">{user.email?.split('@')[0]}</p>
          <p className="text-xs text-muted-foreground">ログイン中</p>
        </div>
        <div className="p-2 rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleLogout}
        className="text-red-600 hover:text-red-700"
      >
        <LogOut className="mr-2 h-4 w-4" />
        ログアウト
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/signin">ログイン</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/auth/signup">新規登録</Link>
      </Button>
    </>
  )}
</div>
```

---

## 6. モバイル対応

### 6.1 設定画面のモバイル版実装

**問題**: モバイル版設定画面が「準備中」のプレースホルダーだった

**修正内容**:
```typescript
{/* モバイルレイアウト */}
<div className="md:hidden pb-16">
  <main className="p-4">
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">設定</h1>
      <p className="text-muted-foreground text-sm">
        アカウント設定と経費管理の設定
      </p>
    </div>

    {/* ユーザー情報カード */}
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">メールアドレス</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* 主要設定項目のリスト */}
    <div className="space-y-3">
      {/* 各設定項目のカード */}
    </div>
  </main>
</div>
```

---

## 7. デプロイとGit管理

### 7.1 コミット手順

**各修正後の標準的なコミット手順**:
```bash
cd "/path/to/keiri-app"

# 変更状況確認
git status

# 変更をステージング
git add .

# コミット（詳細なメッセージ）
git commit -m "$(cat <<'EOF'
Fix [issue description]

- [具体的な変更内容1]
- [具体的な変更内容2]
- [具体的な変更内容3]

[修正によって解決された問題の説明]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# リモートにプッシュ
git push origin develop
```

### 7.2 Vercelへの自動デプロイ

- GitHubへのプッシュで自動的にVercelがデプロイを実行
- 通常1-3分で完了
- デプロイ後はブラウザキャッシュクリア推奨（Ctrl+F5 または Cmd+Shift+R）

---

## 8. トラブルシューティング

### 8.1 認証エラーが続く場合

1. **ブラウザキャッシュクリア**
   ```
   Chrome: Ctrl+Shift+Delete → すべてクリア
   Safari: Cmd+Option+E → キャッシュクリア
   ```

2. **Supabase認証状態確認**
   ```javascript
   // ブラウザコンソールで実行
   console.log(await supabase.auth.getSession())
   ```

3. **環境変数確認**
   ```bash
   # .env.local の内容確認
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

### 8.2 404エラーが残る場合

1. **ファイル存在確認**
   ```bash
   find src/app -name "page.tsx" | grep [target-page]
   ```

2. **デプロイ状況確認**
   - Vercelダッシュボードでビルド状況確認
   - エラーログの確認

### 8.3 データベースエラーの場合

1. **Supabaseダッシュボード確認**
   - テーブル構造確認
   - RLS (Row Level Security) 設定確認

2. **型定義の同期**
   ```bash
   npx supabase gen types typescript --project-id [PROJECT_ID] > src/lib/types/database.types.ts
   ```

---

## 9. 完成したファイル構造

```
src/
├── app/
│   ├── dashboard/page.tsx ✅ 認証ガード強化
│   ├── export/page.tsx ✅ 認証ガード追加
│   ├── settings/
│   │   ├── page.tsx ✅ モバイル対応
│   │   ├── security/page.tsx ✅ 新規作成
│   │   ├── notifications/page.tsx ✅ 新規作成
│   │   └── appearance/page.tsx ✅ 新規作成
│   ├── profile/
│   │   └── tax/page.tsx ✅ 新規作成
│   └── api/
│       └── transactions/bulk/route.ts ✅ スキーマ修正
├── components/
│   ├── auth/
│   │   └── AuthGuard.tsx ✅ 新規作成
│   └── layout/
│       ├── header.tsx ✅ 認証状態連動
│       └── sidebar.tsx ✅ ユーザーメニュー追加
├── lib/
│   └── types/
│       └── database.types.ts ✅ 型定義修正
└── hooks/
    └── useAuth.ts ✅ 既存（修正不要）
```

---

## 10. 再作成時のチェックリスト

### 10.1 初期セットアップ
- [ ] Next.js 15.5.0 + TypeScript + Tailwind CSS
- [ ] Supabase設定（認証・データベース）
- [ ] Vercelデプロイ設定

### 10.2 認証システム
- [ ] useAuth hookの実装
- [ ] 全ページに認証ガード追加
- [ ] ローディング・未認証状態の適切な表示

### 10.3 UI/UXコンポーネント
- [ ] Header（認証状態連動）
- [ ] Sidebar（ユーザーメニュー付き）
- [ ] BottomNav（モバイル対応）
- [ ] AuthGuard共通コンポーネント

### 10.4 必須ページ
- [ ] ダッシュボード
- [ ] 設定画面（デスクトップ・モバイル両対応）
- [ ] プロフィール設定画面群
- [ ] セキュリティ・通知・表示設定画面

### 10.5 データベース整合性
- [ ] テーブル構造とコードの一致確認
- [ ] 型定義ファイルの最新化
- [ ] RLS設定の確認

### 10.6 最終チェック
- [ ] 本番環境でコンソールエラーがないこと
- [ ] 未認証時の適切なリダイレクト
- [ ] 認証済み時のユーザーメニュー表示
- [ ] モバイル・デスクトップ両方での動作確認

---

**このドキュメントに従って実装すれば、同じ品質のKeiri Appを再作成可能です。**