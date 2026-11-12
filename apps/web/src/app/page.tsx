import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CatalogLayout } from '@/components/CatalogLayout';
import { ProductPhoto } from '@/components/ProductPhoto';
import { getProducts } from '@/lib/api';
import { formatPrice, isInStock } from '@/lib/product-options';

export default async function MenuPage() {
  const products = await getProducts();

  return (
    <CatalogLayout>
      <h1 className="mb-7 text-3xl font-bold tracking-tight sm:mb-10 sm:text-4xl">Thực đơn</h1>
      {products.length === 0 ? (
        <p className="border-t border-stone-300 py-8 text-stone-700">Thực đơn hiện chưa có món.</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/products/${product.id}`} className="group block overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm transition-transform motion-safe:hover:-translate-y-0.5">
                <ProductPhoto imageUrl={product.imageUrl} name={product.name} />
                <div className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">{product.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-amber-800">{formatPrice(product.price)}</p>
                    {!isInStock(product) && <p className="mt-1 text-sm text-red-800">Hết hàng</p>}
                  </div>
                  <ArrowUpRight size={19} aria-hidden="true" className="mt-1 shrink-0" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CatalogLayout>
  );
}
