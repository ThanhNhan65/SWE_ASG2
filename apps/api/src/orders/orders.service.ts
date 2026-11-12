import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStateMachine, OrderStatus } from './order-state-machine.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: OrderStateMachine,
  ) {}

  async findByUserId(userId: string | number, status?: OrderStatus) {
    const uId = Number(userId);
    return this.prisma.order.findMany({
      where: {
        userId: uId,
        ...(status ? { status } : {}),
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByCode(orderCode: string) {
    const orderId = orderCode.startsWith('ORD-')
      ? Number(orderCode.slice(4))
      : Number(orderCode);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã: ${orderCode}`);
    }

    return order;
  }

  async transitionOrderStatus(orderCode: string, nextStatus: OrderStatus) {
    const order = await this.findByCode(orderCode);

    if (order.status === nextStatus) {
      return order;
    }

    this.stateMachine.assertTransition(order.status as OrderStatus, nextStatus);

    return this.prisma.order.update({
      where: { id: order.id },
      data: { status: nextStatus },
      include: { items: true },
    });
  }
}
