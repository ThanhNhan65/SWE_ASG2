import { Injectable, BadRequestException } from '@nestjs/common';

export interface SugarIceRatio {
  sugarGrams: number;
  iceGrams: number;
}

@Injectable()
export class SugarIceCalculator {
  // Định mức tiêu chuẩn cho 100% đường (15g) và 100% đá (100g)
  private readonly BASE_SUGAR_GRAMS = 15;
  private readonly BASE_ICE_GRAMS = 100;

  private readonly VALID_SUGAR_PERCENTAGES = [0, 30, 50, 70, 100];
  private readonly VALID_ICE_PERCENTAGES = [0, 30, 50, 70, 100];

  calculate(sugarPercent: number, icePercent: number): SugarIceRatio {
    if (!this.VALID_SUGAR_PERCENTAGES.includes(sugarPercent)) {
      throw new BadRequestException(
        `Mức đường ${sugarPercent}% không hợp lệ. Chỉ chấp nhận: 0%, 30%, 50%, 70%, 100%`,
      );
    }

    if (!this.VALID_ICE_PERCENTAGES.includes(icePercent)) {
      throw new BadRequestException(
        `Mức đá ${icePercent}% không hợp lệ. Chỉ chấp nhận: 0%, 30%, 50%, 70%, 100%`,
      );
    }

    return {
      sugarGrams: (this.BASE_SUGAR_GRAMS * sugarPercent) / 100,
      iceGrams: (this.BASE_ICE_GRAMS * icePercent) / 100,
    };
  }
}
