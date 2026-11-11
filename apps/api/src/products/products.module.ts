import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SugarIceCalculator } from './sugar-ice.calculator';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, SugarIceCalculator],
  exports: [ProductsService, SugarIceCalculator],
})
export class ProductsModule {}
