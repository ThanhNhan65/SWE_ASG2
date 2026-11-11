import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'BrewLite - Coffee Ordering System',
  description: 'Hệ thống đặt cà phê trực tuyến BrewLite',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
