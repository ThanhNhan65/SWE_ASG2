import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiscountType, Prisma, Promotion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiscountStrategy } from './strategies/discount-strategy.interface.js';
import { PercentageDiscountStrategy } from './strategies/percentage-discount.strategy.js';
import { FixedDiscountStrategy } from './strategies/fixed-discount.strategy.js';

export interface PromotionValidationResult {
  promotion: Promotion;
  discountAmount: number;
  subtotal: number;
  finalTotal: number;
}

/**
 * [OOP & SOLID - Dependency Injection & Strategy Pattern]
 * Quản lý vòng đời, kiểm tra điều kiện và tính toán khuyến mãi cho đơn hàng.
 */
@Injectable()
export class PromotionsService {
  private readonly strategies: Record<DiscountType, DiscountStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly percentageStrategy: PercentageDiscountStrategy,
    private readonly fixedStrategy: FixedDiscountStrategy,
  ) {
    // Ánh xạ DiscountType enum sang Strategy tương ứng (Đa hình Polymorphism)
    this.strategies = {
      [DiscountType.PERCENTAGE]: this.percentageStrategy,
      [DiscountType.FIXED]: this.fixedStrategy,
    };
  }

  async findByCode(code: string): Promise<Promotion> {
    const cleanCode = code.trim().toUpperCase();
    const promo = await this.prisma.promotion.findUnique({ where: { code: cleanCode } });
    if (!promo) {
      throw new NotFoundException(`Không tìm thấy mã khuyến mãi ${cleanCode}`);
    }
    return promo;
  }

  /**
   * Kiểm tra điều kiện áp dụng và tính toán số tiền giảm giá của mã khuyến mãi
   */
  async validateAndCalculate(
    code: string,
    subtotal: number,
  ): Promise<PromotionValidationResult> {
    const cleanCode = code ? code.trim().toUpperCase() : '';
    if (!cleanCode) {
      throw new BadRequestException('Mã khuyến mãi không được để trống');
    }

    if (subtotal < 0) {
      throw new BadRequestException('Giá trị đơn hàng không hợp lệ');
    }

    const promotion = await this.prisma.promotion.findUnique({
      where: { code: cleanCode },
    });

    if (!promotion) {
      throw new NotFoundException(`Mã khuyến mãi "${cleanCode}" không tồn tại trong hệ thống`);
    }

    if (!promotion.isActive) {
      throw new BadRequestException(`Mã khuyến mãi "${cleanCode}" hiện đang tạm ngừng áp dụng`);
    }

    if (promotion.expiredAt && new Date() > new Date(promotion.expiredAt)) {
      throw new BadRequestException(`Mã khuyến mãi "${cleanCode}" đã hết hạn sử dụng`);
    }

    if (
      promotion.usageLimit !== null &&
      promotion.usageLimit !== undefined &&
      promotion.usedCount >= promotion.usageLimit
    ) {
      throw new BadRequestException(`Mã khuyến mãi "${cleanCode}" đã đạt giới hạn lượt sử dụng`);
    }

    if (subtotal < promotion.minOrderValue) {
      throw new BadRequestException(
        `Đơn hàng cần đạt tối thiểu ${promotion.minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã này`,
      );
    }

    const strategy = this.strategies[promotion.discountType];
    if (!strategy) {
      throw new BadRequestException(`Loại khuyến mãi "${promotion.discountType}" chưa được hỗ trợ`);
    }

    const discountAmount = strategy.calculateDiscount(
      subtotal,
      promotion.discountValue,
      promotion.maxDiscount ?? undefined,
    );

    const finalTotal = Math.max(0, subtotal - discountAmount);

    return {
      promotion,
      discountAmount,
      subtotal,
      finalTotal,
    };
  }

  /**
   * Cập nhật số lượt sử dụng mã khuyến mãi trong transaction an toàn
   */
  async recordUsageInTransaction(
    tx: Prisma.TransactionClient,
    promotionId: number,
  ): Promise<void> {
    await tx.promotion.update({
      where: { id: promotionId },
      data: { usedCount: { increment: 1 } },
    });
  }

  /**
   * Lấy danh sách các mã khuyến mãi đang có hiệu lực
   */
  async getAvailablePromotions(): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        expiredAt: { gt: new Date() },
      },
      orderBy: { minOrderValue: 'asc' },
    });
  }
}
