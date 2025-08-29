'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Calculator, AlertCircle } from 'lucide-react';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        setError(error.message === 'Invalid login credentials' 
          ? 'メールアドレスまたはパスワードが間違っています'
          : `ログインエラー: ${error.message}`);
      } else if (data.session) {
        router.push('/dashboard');
      } else {
        setError('ログインに失敗しました。再度お試しください。');
      }
    } catch (error: any) {
      console.error('ログインエラー:', error);
      setError(`予期しないエラー: ${error?.message || 'ログインに失敗しました'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Calculator className="h-12 w-12 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">ログイン</CardTitle>
            <CardDescription className="mt-2">
              Keiriアカウントにログインしてください
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                パスワード
              </label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            <span className="text-muted-foreground/70">
              パスワードをお忘れの場合はサポートまでお問い合わせください
            </span>
          </div>
          <div className="text-sm text-center text-muted-foreground">
            アカウントをお持ちでない方は{' '}
            <Link href="/auth/signup" className="text-primary hover:underline">
              新規登録
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}