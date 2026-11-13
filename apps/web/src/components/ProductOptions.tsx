'use client';

import { useState, type FormEvent } from 'react';
import type { Product, Topping } from '@/lib/api';
import { formatPrice, isInStock, sizes, sizeSurcharges, type Size } from '@/lib/product-options';
import { useCartStore } from '@/store/useCartStore';

const SWEETNESS_LEVELS = ['0%', '30%', '50%', '70%', '100%'] as const;
const ICE_LEVELS = ['Không đá', 'Ít đá', 'Bình thường'] as const;

export function ProductOptions({ product, toppings }: { product: Product; toppings: Topping[] }) {
  const [size, setSize] = useState<Size>('S');
  const [sweetness, setSweetness] = useState<string>('100%');
  const [ice, setIce] = useState<string>('Bình thường');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const addToCart = useCartStore((state) => state.addToCart);
  const selectedToppings = toppings.filter((topping) => selectedIds.includes(topping.id));
  const unitPrice =
    product.price +
    sizeSurcharges[size] +
    selectedToppings.reduce((total, topping) => total + topping.price, 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !isInStock(product) ||
      !sizes.includes(size) ||
      selectedToppings.length !== selectedIds.length ||
      selectedToppings.some((topping) => !isInStock(topping))
    ) {
      setMessage('Vui lòng kiểm tra lại size và topping đã chọn.');
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      size,
      sweetness,
      ice,
      qty: 1,
      toppings: selectedToppings.map(({ id, name, price }) => ({ id, name, price })),
      unitPrice,
    });
    setMessage('Đã thêm món vào giỏ.');
  }

  if (!isInStock(product)) return <p className="mt-6 text-red-800">Món này đã hết hàng.</p>;

  return (
    <form onSubmit={submit} className="mt-6 space-y-6 border-t border-stone-300 pt-5">
      <fieldset>
        <legend className="mb-2 font-semibold">Kích cỡ</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((option) => (
            <label
              key={option}
              className="flex min-h-11 cursor-pointer items-center gap-2 border border-stone-300 px-3 rounded-xl has-[:checked]:border-amber-700 has-[:checked]:bg-amber-50"
            >
              <input
                type="radio"
                name="size"
                checked={size === option}
                onChange={() => {
                  setSize(option);
                  setMessage('');
                }}
                className="accent-amber-700"
              />
              {option}
              {sizeSurcharges[option] > 0 && ` +${formatPrice(sizeSurcharges[option])}`}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Mức đường</legend>
        <div className="flex flex-wrap gap-2">
          {SWEETNESS_LEVELS.map((level) => (
            <label
              key={level}
              className="flex min-h-10 cursor-pointer items-center gap-2 border border-stone-300 px-3 rounded-xl text-sm has-[:checked]:border-amber-700 has-[:checked]:bg-amber-50"
            >
              <input
                type="radio"
                name="sweetness"
                checked={sweetness === level}
                onChange={() => {
                  setSweetness(level);
                  setMessage('');
                }}
                className="accent-amber-700"
              />
              {level}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Mức đá</legend>
        <div className="flex flex-wrap gap-2">
          {ICE_LEVELS.map((level) => (
            <label
              key={level}
              className="flex min-h-10 cursor-pointer items-center gap-2 border border-stone-300 px-3 rounded-xl text-sm has-[:checked]:border-amber-700 has-[:checked]:bg-amber-50"
            >
              <input
                type="radio"
                name="ice"
                checked={ice === level}
                onChange={() => {
                  setIce(level);
                  setMessage('');
                }}
                className="accent-amber-700"
              />
              {level}
            </label>
          ))}
        </div>
      </fieldset>

      {toppings.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-semibold">Topping</legend>
          {toppings.map((topping) => (
            <label key={topping.id} className="flex min-h-11 items-center gap-3 border-b border-stone-300 py-2">
              <input
                type="checkbox"
                checked={selectedIds.includes(topping.id)}
                disabled={!isInStock(topping)}
                className="accent-amber-700"
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelectedIds((ids) =>
                    checked ? [...ids, topping.id] : ids.filter((id) => id !== topping.id),
                  );
                  setMessage('');
                }}
              />
              <span className="flex-1">{topping.name}</span>
              <span className="text-sm text-stone-700">
                {isInStock(topping) ? `+${formatPrice(topping.price)}` : 'Hết hàng'}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <button
        type="submit"
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-amber-700 px-4 font-medium text-white hover:bg-amber-800"
      >
        <span>Thêm vào giỏ</span>
        <span>{formatPrice(unitPrice)}</span>
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
