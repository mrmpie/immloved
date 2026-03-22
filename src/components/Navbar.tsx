'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Trash2, Search, Upload, Database, HardDrive, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const dbConnected = isSupabaseConfigured();

  const links = [
    { href: '/', label: 'Favorites', icon: Heart },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/removed', label: 'Removed', icon: Trash2 },
    { href: '/import', label: 'Import', icon: Upload },
    { href: '/analysis', label: 'AI Analysis', icon: Sparkles, alwaysShowLabel: true },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-4">
        {/* Logo */}
        <Link href="/" className="mr-4 flex items-center gap-1.5">
          <span className="text-lg">🏠</span>
          <span className="text-base font-bold tracking-tight sm:text-xl">
            <span className="text-primary">Imm</span>
            <span className="text-secondary">loved</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon, alwaysShowLabel }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors sm:gap-1.5 sm:px-3',
                pathname === href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className={alwaysShowLabel ? 'inline' : 'hidden sm:inline'}>{label}</span>
            </Link>
          ))}
        </div>

      </div>
    </nav>
  );
}
