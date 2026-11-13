export interface DiscountStrategy {
  calculateDiscount(subtotal: number, discountValue: number, maxDiscount?: number): number;
}
