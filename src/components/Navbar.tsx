'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Trash2, Search, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Favorites', icon: Heart },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/removed', label: 'Removed', icon: Trash2 },
    { href: '/import', label: 'Import', icon: Upload },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-4">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-primary">Imm</span>
            <span className="text-secondary">loved</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
