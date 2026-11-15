import { createHmac, timingSafeEqual } from 'node:crypto';
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
import { OrdersService } from './orders.service.js';
import { OrderStatus } from './order-state-machine.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

interface AuthenticatedRequest {
  user?: {
    id?: number | string;
    userId?: number | string;
  };
  headers?: {
    authorization?: string;
  };
}

function extractUserIdFromRequest(req?: AuthenticatedRequest): number | string | undefined {
  const existingUserId = req?.user?.id ?? req?.user?.userId;
  if (existingUserId !== undefined && existingUserId !== null) {
    return existingUserId;
  }

  const authHeader = req?.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return undefined;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return undefined;
  }

  const parts = match[1].trim().split('.');
  if (parts.length !== 3) {
    return undefined;
  }

  try {
    const [headerB64, payloadB64, sigB64] = parts;
    const secret = process.env.JWT_SECRET || 'brewlite_jwt_secret_key_2026';
    const expectedSig = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const sigBuf = Buffer.from(sigB64);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return undefined;
    }

    const decoded: unknown = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (typeof decoded !== 'object' || decoded === null) {
      return undefined;
    }

    const payload = decoded as { sub?: number | string; exp?: number };
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      return undefined;
    }

    return payload.sub;
  } catch {
    return undefined;
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Task 5.4: Endpoint tạo đơn hàng từ giỏ hàng
   * POST /orders
   */
  @Post()
  async createOrder(@Body() dto: CreateOrderDto, @Request() req: AuthenticatedRequest) {
    const authUserId = extractUserIdFromRequest(req);
    return this.ordersService.createOrder(dto, authUserId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@Request() req: AuthenticatedRequest, @Query('status') status?: OrderStatus) {
    const userId = req.user?.id || req.user?.userId || '';
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
