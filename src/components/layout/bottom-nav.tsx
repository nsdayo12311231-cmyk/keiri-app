'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Receipt, 
  PieChart, 
  Settings,
  CheckCheck,
  Download,
  Calculator,
  Upload,
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
    label: 'ホーム',
    icon: Home,
  },
  {
    href: '/transactions',
    label: '取引',
    icon: Receipt,
  },
  {
    href: '/approval',
    label: '承認',
    icon: CheckCheck,
  },
  {
    href: '/import',
    label: 'CSV',
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
    label: '出力',
    icon: Download,
  },
  {
    href: '/settings',
    label: '設定',
    icon: Settings,
  },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden',
      className
    )}>
      <div className="grid grid-cols-7 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center space-y-1 px-1 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary bg-muted'
                  : 'text-muted-foreground hover:text-primary hover:bg-accent'
              )}
            >
              <Icon className={cn(
                'h-5 w-5',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'text-xs font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}