import { describe, it, expect, beforeEach } from 'vitest';
import { SugarIceCalculator } from './sugar-ice.calculator.js';
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
});
