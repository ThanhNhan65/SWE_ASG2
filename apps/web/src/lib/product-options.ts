export const sizeSurcharges = { S: 0, M: 5000, L: 10000 } as const;
export type Size = keyof typeof sizeSurcharges;
export const sizes: Size[] = ['S', 'M', 'L'];

export function isInStock(item: { isAvailable: boolean; stock: number }) {
  return item.isAvailable && item.stock > 0;
}

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export function formatPrice(price: number) {
  return currency.format(price);
}
