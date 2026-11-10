import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStateMachine } from './order-state-machine';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PrismaModule, ProductsModule, PromotionsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStateMachine],
  exports: [OrdersService, OrderStateMachine],
})
export class OrdersModule {}
