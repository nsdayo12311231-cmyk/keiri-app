'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Calculator, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      showToast('success', 'ログアウト完了', 'ログアウトしました');
      router.push('/');
    } catch (error) {
      showToast('error', 'エラー', 'ログアウト中にエラーが発生しました');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className={cn('bg-background border-b border-border', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Calculator className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Keiri</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              ダッシュボード
            </Link>
            <Link
              href="/transactions"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              取引管理
            </Link>
            <Link
              href="/reports"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              レポート
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              設定
            </Link>
          </nav>

          {/* Desktop User Menu */}
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
                  disabled={isLoggingOut}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
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

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
            <span className="sr-only">メニューを開く</span>
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                href="/dashboard"
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary hover:bg-accent transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ダッシュボード
              </Link>
              <Link
                href="/transactions"
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary hover:bg-accent transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                取引管理
              </Link>
              <Link
                href="/reports"
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary hover:bg-accent transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                レポート
              </Link>
              <Link
                href="/settings"
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary hover:bg-accent transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                設定
              </Link>
              <div className="pt-4 border-t border-border">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 px-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground">ログイン中</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/auth/signin">ログイン</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/auth/signup">新規登録</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}