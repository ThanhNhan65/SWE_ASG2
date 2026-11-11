import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsService } from './promotions.service.js';
import { LoyaltyService } from './loyalty.service.js';
import { FixedDiscountStrategy } from './strategies/fixed-discount.strategy.js';
import { PercentageDiscountStrategy } from './strategies/percentage-discount.strategy.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    LoyaltyService,
    FixedDiscountStrategy,
    PercentageDiscountStrategy,
  ],
  exports: [PromotionsService, LoyaltyService],
})
export class PromotionsModule {}
