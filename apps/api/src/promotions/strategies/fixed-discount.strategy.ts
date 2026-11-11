import { DiscountStrategy } from './discount-strategy.interface.js';

export class FixedDiscountStrategy implements DiscountStrategy {
  calculateDiscount(subtotal: number, discountValue: number): number {
    return Math.min(subtotal, discountValue);
  }
}
