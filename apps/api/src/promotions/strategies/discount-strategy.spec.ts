import { describe, it, expect } from 'vitest';
import { PercentageDiscountStrategy } from './percentage-discount.strategy.js';
import { FixedDiscountStrategy } from './fixed-discount.strategy.js';

describe('Discount Strategies - Unit Tests', () => {
  const percentageStrategy = new PercentageDiscountStrategy();
  const fixedStrategy = new FixedDiscountStrategy();

  it('tính đúng giảm giá phần trăm khi không vượt maxDiscount', () => {
    // 100,000 * 20% = 20,000, maxDiscount 30,000 -> 20,000
    expect(percentageStrategy.calculateDiscount(100000, 20, 30000)).toBe(20000);
  });

  it('giới hạn mức giảm tối đa nếu vượt maxDiscount', () => {
    // 200,000 * 20% = 40,000, maxDiscount 30,000 -> 30,000
    expect(percentageStrategy.calculateDiscount(200000, 20, 30000)).toBe(30000);
  });

  it('tính đúng giảm giá số tiền cố định', () => {
    expect(fixedStrategy.calculateDiscount(50000, 10000)).toBe(10000);
  });

  it('không giảm quá tổng giá trị đơn hàng', () => {
    expect(fixedStrategy.calculateDiscount(8000, 10000)).toBe(8000);
  });
});
