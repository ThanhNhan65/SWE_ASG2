import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsService } from './promotions.service.js';
import { LoyaltyPointsService } from './loyalty.service.js';
import { FixedDiscountStrategy } from './strategies/fixed-discount.strategy.js';
import { PercentageDiscountStrategy } from './strategies/percentage-discount.strategy.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    LoyaltyPointsService,
    FixedDiscountStrategy,
    PercentageDiscountStrategy,
  ],
  exports: [PromotionsService, LoyaltyPointsService],
})
export class PromotionsModule {}
