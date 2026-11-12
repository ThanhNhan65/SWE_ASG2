'use client';

import { CatalogLayout } from '@/components/CatalogLayout';

export default function CatalogError({ retry }: { retry: () => void }) {
  return (
    <CatalogLayout>
      <h1 className="text-2xl font-semibold">Không tải được sản phẩm</h1>
      <button type="button" onClick={retry} className="mt-5 min-h-11 rounded-xl bg-amber-700 px-5 font-semibold text-white transition hover:bg-amber-800">Thử lại</button>
    </CatalogLayout>
  );
}
