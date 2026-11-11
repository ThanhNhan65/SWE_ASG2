import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { WalletPaymentStrategy } from './strategies/wallet-payment.strategy.js';
import { CardPaymentStrategy } from './strategies/card-payment.strategy.js';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WalletPaymentStrategy,
    CardPaymentStrategy,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
