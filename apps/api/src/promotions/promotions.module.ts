import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { LoyaltyService } from './loyalty.service';
import { FixedDiscountStrategy } from './strategies/fixed-discount.strategy';
import { PercentageDiscountStrategy } from './strategies/percentage-discount.strategy';
import { PrismaModule } from '../prisma/prisma.module';

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
