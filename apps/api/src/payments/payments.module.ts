import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WalletPaymentStrategy } from './strategies/wallet-payment.strategy';
import { CardPaymentStrategy } from './strategies/card-payment.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PrismaModule, OrdersModule, PromotionsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WalletPaymentStrategy,
    CardPaymentStrategy,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
