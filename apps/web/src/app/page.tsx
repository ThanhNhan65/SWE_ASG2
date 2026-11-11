import Link from 'next/link';
import React from 'react';

export default function HomePage() {
  return (
    <main className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Chào mừng đến với BrewLite!</h1>
      <p className="mb-4">Hệ thống đặt cà phê và thanh toán thông minh.</p>
      <div className="flex gap-4">
        <Link href="/cart" className="text-amber-600 underline">
          Xem Giỏ Hàng
        </Link>
        <Link href="/orders" className="text-amber-600 underline">
          Lịch Sử Đơn Hàng
        </Link>
      </div>
    </main>
  );
}
