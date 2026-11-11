import { Injectable } from '@nestjs/common';

@Injectable()
export class SugarIceCalculator {
  calculateSugar(sweetness: string, baseAmount: number = 20): number {
    switch (sweetness) {
      case '0%':
        return 0;
      case '30%':
        return Math.round(baseAmount * 0.3);
      case '50%':
        return Math.round(baseAmount * 0.5);
      case '70%':
        return Math.round(baseAmount * 0.7);
      case '100%':
      default:
        return baseAmount;
    }
  }

  calculateIce(ice: string, baseAmount: number = 100): number {
    switch (ice) {
      case '0%':
      case 'Không đá':
        return 0;
      case '30%':
      case 'Ít đá':
        return Math.round(baseAmount * 0.3);
      case '50%':
        return Math.round(baseAmount * 0.5);
      case '70%':
        return Math.round(baseAmount * 0.7);
      case '100%':
      case 'Bình thường':
      default:
        return baseAmount;
    }
  }
}
