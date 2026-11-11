import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrderStatus } from './order-state-machine.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@Request() req: any, @Query('status') status?: OrderStatus) {
    const userId = req.user?.id || req.user?.userId;
    return this.ordersService.findByUserId(userId, status);
  }

  @Get(':orderCode')
  async getOrder(@Param('orderCode') orderCode: string) {
    return this.ordersService.findByCode(orderCode);
  }

  @Patch(':orderCode/status')
  async updateStatus(
    @Param('orderCode') orderCode: string,
    @Body('status') nextStatus: OrderStatus,
  ) {
    return this.ordersService.transitionOrderStatus(orderCode, nextStatus);
  }
}
