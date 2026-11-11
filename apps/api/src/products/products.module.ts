import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { SugarIceCalculator } from './sugar-ice.calculator.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, SugarIceCalculator],
  exports: [ProductsService, SugarIceCalculator],
})
export class ProductsModule {}
