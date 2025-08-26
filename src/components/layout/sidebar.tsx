'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Receipt, 
  PieChart, 
  Settings,
  Calculator,
  FileText,
  CreditCard,
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
    href: '/reports',
    label: 'レポート',
    icon: PieChart,
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

  return (
    <div className={cn(
      'hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0',
      className
    )}>
      <div className="flex-1 flex flex-col min-h-0 border-r border-border bg-background">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-border">
          <Link href="/" className="flex items-center space-x-2">
            <Calculator className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Keiri</span>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="flex-shrink-0 flex border-t border-border p-4">
          <div className="flex items-center w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                ユーザー名
              </p>
              <p className="text-xs text-muted-foreground truncate">
                user@example.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}