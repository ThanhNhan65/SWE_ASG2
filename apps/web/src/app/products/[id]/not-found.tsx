import Link from 'next/link';
import { CatalogLayout } from '@/components/CatalogLayout';

export default function ProductNotFound() {
  return (
    <CatalogLayout>
      <h1 className="text-2xl font-semibold">Không tìm thấy món</h1>
      <Link href="/" className="mt-3 inline-flex min-h-11 items-center underline">Về thực đơn</Link>
    </CatalogLayout>
  );
}
