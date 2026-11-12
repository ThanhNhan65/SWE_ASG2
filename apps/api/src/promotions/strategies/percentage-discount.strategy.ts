import { DiscountStrategy } from './discount-strategy.interface.js';

export class PercentageDiscountStrategy implements DiscountStrategy {
  calculateDiscount(subtotal: number, discountValue: number, maxDiscount?: number): number {
    const rawDiscount = Math.round((subtotal * discountValue) / 100);
    if (maxDiscount && maxDiscount > 0) {
      return Math.min(rawDiscount, maxDiscount);
    }
    return rawDiscount;
  }
}
