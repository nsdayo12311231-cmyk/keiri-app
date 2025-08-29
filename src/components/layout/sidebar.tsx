'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { 
  Home, 
  Receipt, 
  PieChart, 
  Settings,
  Calculator,
  FileText,
  CreditCard,
  Camera,
  CheckCheck,
  Download,
  Upload,
  LogOut,
  User,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'ダッシュボード',
    icon: Home,
  },
  {
    href: '/transactions',
    label: '取引管理',
    icon: Receipt,
  },
  {
    href: '/approval',
    label: '取引承認',
    icon: CheckCheck,
  },
  {
    href: '/journal',
    label: '仕訳帳',
    icon: FileText,
  },
  {
    href: '/accounts',
    label: '口座管理',
    icon: CreditCard,
  },
  {
    href: '/import',
    label: 'ファイルインポート',
    icon: Upload,
  },
  {
    href: '/reports',
    label: 'レポート',
    icon: PieChart,
  },
  {
    href: '/tax',
    label: '税務',
    icon: Calculator,
  },
  {
    href: '/export',
    label: 'データ出力',
    icon: Download,
  },
  {
    href: '/receipts',
    label: 'レシート',
    icon: Camera,
  },
  {
    href: '/settings',
    label: '設定',
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 未ログイン時はサイドバーを表示しない
  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

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

  // メニュー項目のdata属性マッピング
  const getMenuDataAttribute = (href: string) => {
    const pathToDataAttr: Record<string, string> = {
      '/dashboard': 'dashboard',
      '/receipts': 'receipts', 
      '/approval': 'approval',
      '/reports': 'reports',
      '/import': 'import',
      '/transactions': 'transactions',
      '/journal': 'journal',
      '/accounts': 'accounts',
      '/tax': 'tax',
      '/export': 'export',
      '/settings': 'settings'
    };
    return pathToDataAttr[href] || '';
  };

  return (
    <div className={cn(
      'hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 sidebar-container',
      className
    )}>
      <div className="flex-1 flex flex-col min-h-0 border-r border-border bg-background">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Calculator className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Keiri App</span>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const dataMenu = getMenuDataAttribute(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                data-menu={dataMenu}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-300',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
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
              disabled={isLoggingOut}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}