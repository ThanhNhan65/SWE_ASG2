import Link from 'next/link';
import { CatalogLayout } from '@/components/CatalogLayout';
import { ProductPhoto } from '@/components/ProductPhoto';
import { ProductOptions } from '@/components/ProductOptions';
import { getProduct, getToppings } from '@/lib/api';
import { formatPrice } from '@/lib/product-options';
import { notFound } from 'next/navigation';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!/^\d+$/.test(id) || productId < 1 || productId > 2147483647) notFound();

  const product = await getProduct(productId);
  if (!product) notFound();
  const toppings = await getToppings();

  return (
    <CatalogLayout>
      <Link href="/" className="mb-5 inline-flex min-h-11 items-center rounded-xl px-3 text-stone-700 hover:bg-stone-100">← Thực đơn</Link>
      <div className="grid items-start gap-7 md:grid-cols-2 md:gap-12">
        <ProductPhoto imageUrl={product.imageUrl} name={product.name} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-2 font-semibold text-amber-800">{formatPrice(product.price)}</p>
          {product.description && <p className="mt-3 text-stone-700">{product.description}</p>}
          <ProductOptions product={product} toppings={toppings} />
        </div>
      </div>
    </CatalogLayout>
  );
}
