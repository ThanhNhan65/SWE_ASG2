import { CatalogLayout } from '@/components/CatalogLayout';

export default function CatalogLoading() {
  return (
    <CatalogLayout>
      <div role="status" className="py-20 text-center text-stone-500">
        <div aria-hidden="true" className="inline-block h-8 w-8 rounded-full border-4 border-amber-600 border-t-transparent motion-safe:animate-spin" />
        <p className="mt-2 text-sm">Đang tải sản phẩm…</p>
      </div>
    </CatalogLayout>
  );
}
