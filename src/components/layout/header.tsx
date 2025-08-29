'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
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

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/signin">ログイン</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/signup">新規登録</Link>
            </Button>
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
              <div className="flex flex-col space-y-2 pt-4 border-t border-border">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/signin">ログイン</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/signup">新規登録</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}