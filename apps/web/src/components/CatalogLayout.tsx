import Link from 'next/link';
import type { ReactNode } from 'react';
import { CartBadge } from './CartBadge';

export function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <a href="#catalog-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3">Đến nội dung</a>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <nav aria-label="Điều hướng chính" className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="py-2 text-xl font-bold text-amber-900">BrewLite</Link>
          <div className="flex items-center gap-4 text-sm font-medium text-stone-700">
            <Link href="/orders" className="hover:text-amber-800 transition">Đơn hàng</Link>
            <Link href="/login" className="hover:text-amber-800 transition">Tài khoản</Link>
            <CartBadge />
          </div>
        </nav>
      </header>
      <main id="catalog-content" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">{children}</main>
    </div>
  );
}
