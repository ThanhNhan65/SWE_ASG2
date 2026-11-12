import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from './order-state-machine';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Task 5.4: Endpoint tạo đơn hàng từ giỏ hàng
   * POST /orders
   */
  @Post()
  async createOrder(@Body() dto: CreateOrderDto, @Request() req: any) {
    const authUserId = req.user?.id || req.user?.userId;
    return this.ordersService.createOrder(dto, authUserId);
  }

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
