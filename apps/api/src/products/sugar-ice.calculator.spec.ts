import { describe, it, expect, beforeEach } from 'vitest';
import {
  SugarIceCalculator,
  calculateAvailableCupsByIngredients,
  isProductAvailableByIngredients,
} from './sugar-ice.calculator.js';
import { BadRequestException } from '@nestjs/common';

describe('SugarIceCalculator - Unit Tests', () => {
  let calculator: SugarIceCalculator;

  beforeEach(() => {
    calculator = new SugarIceCalculator();
  });

  it('tính đúng định lượng đường và đá cho mức 100% đường và 100% đá', () => {
    const result = calculator.calculate(100, 100);
    expect(result.sugarGrams).toBe(15);
    expect(result.iceGrams).toBe(100);
  });

  it('tính đúng định lượng cho mức 50% đường và 70% đá', () => {
    const result = calculator.calculate(50, 70);
    expect(result.sugarGrams).toBe(7.5);
    expect(result.iceGrams).toBe(70);
  });

  it('tính đúng khi không đường không đá (0% đường, 0% đá)', () => {
    const result = calculator.calculate(0, 0);
    expect(result.sugarGrams).toBe(0);
    expect(result.iceGrams).toBe(0);
  });

  it('ném lỗi BadRequestException khi mức đường không hợp lệ', () => {
    expect(() => calculator.calculate(45, 100)).toThrow(BadRequestException);
    expect(() => calculator.calculate(-10, 100)).toThrow(BadRequestException);
  });

  it('ném lỗi BadRequestException khi mức đá không hợp lệ', () => {
    expect(() => calculator.calculate(100, 25)).toThrow(BadRequestException);
    expect(() => calculator.calculate(100, 150)).toThrow(BadRequestException);
  });

  describe('calculateAvailableCupsByIngredients - Công thức tính số ly tồn kho từ nguyên liệu', () => {
    it('tính đúng số ly Americano Size S từ hạt cà phê (16g / ly)', () => {
      // 160g cà phê -> 160 / 16 = 10 ly
      const cups = calculateAvailableCupsByIngredients('Americano', { coffee: 160 }, 'S');
      expect(cups).toBe(10);
    });

    it('tính đúng số ly Cà phê sữa (giới hạn bởi nguyên liệu ít hơn giữa cà phê và sữa)', () => {
      // Size S cà phê sữa: 18g cà phê, 30ml sữa
      // 180g cà phê (10 ly), 150ml sữa (5 ly) -> giới hạn là 5 ly
      const cups = calculateAvailableCupsByIngredients('Cà phê sữa đá', { coffee: 180, milk: 150 }, 'S');
      expect(cups).toBe(5);
    });

    it('trả về 0 ly khi hết nguyên liệu cốt', () => {
      const cups = calculateAvailableCupsByIngredients('Americano', { coffee: 0 }, 'S');
      expect(cups).toBe(0);
      expect(isProductAvailableByIngredients('Americano', 0, 1000, 1000)).toBe(false);
    });

    it('tính đúng số ly Trà đào từ lá trà (Size S: 10g / ly)', () => {
      // 250g lá trà -> 250 / 10 = 25 ly
      const cups = calculateAvailableCupsByIngredients('Trà đào cam sả', { tea: 250 }, 'S');
      expect(cups).toBe(25);
      expect(isProductAvailableByIngredients('Trà đào cam sả', 0, 250, 0)).toBe(true);
    });
  });
});
