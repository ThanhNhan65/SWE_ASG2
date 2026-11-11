import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OrderStateMachine } from './order-state-machine.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStateMachine],
  exports: [OrdersService, OrderStateMachine],
})
export class OrdersModule {}
