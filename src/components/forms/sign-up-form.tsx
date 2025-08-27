'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Calculator, AlertCircle, CheckCircle } from 'lucide-react';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');

  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (!email || !password) {
      setMessage('メールアドレスとパスワードを入力してください');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage('パスワードは6文字以上で入力してください');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await signUp(email, password, fullName);

      if (error) {
        setMessage(error.message);
        setMessageType('error');
      } else if (data.user && !data.session) {
        setMessage('確認メールを送信しました。メールボックスをご確認ください。');
        setMessageType('success');
      } else if (data.session) {
        setMessage('アカウントが作成されました');
        setMessageType('success');
        router.push('/dashboard');
      }
    } catch (error) {
      setMessage('予期しないエラーが発生しました');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Calculator className="h-12 w-12 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">アカウント作成</CardTitle>
            <CardDescription className="mt-2">
              Keiriで経理を簡単に始めましょう
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                お名前（任意）
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="山田 太郎"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                メールアドレス <span className="text-destructive">*</span>
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
                パスワード <span className="text-destructive">*</span>
              </label>
              <Input
                id="password"
                type="password"
                placeholder="6文字以上で入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {message && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-md ${
                messageType === 'error' 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'bg-success/10 text-success'
              }`}>
                {messageType === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>{message}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '作成中...' : 'アカウントを作成'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            すでにアカウントをお持ちですか？{' '}
            <Link href="/auth/signin" className="text-primary hover:underline">
              ログイン
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}