import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersService } from './orders.service.js';
import { OrderStateMachine, OrderStatus } from './order-state-machine.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersService & OrderStateMachine', () => {
  let ordersService: OrdersService;
  let stateMachine: OrderStateMachine;
  let mockPrisma: any;

  beforeEach(() => {
    stateMachine = new OrderStateMachine();

    mockPrisma = {
      order: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    ordersService = new OrdersService(mockPrisma, stateMachine);
  });

  describe('OrderStateMachine transitions', () => {
    it('cho phép chuyển từ PENDING sang PAID', () => {
      expect(() => {
        stateMachine.assertTransition(OrderStatus.PENDING, OrderStatus.PAID);
      }).not.toThrow();
    });

    it('cho phép chuyển từ PAID sang PREPARING', () => {
      expect(() => {
        stateMachine.assertTransition(OrderStatus.PAID, OrderStatus.PREPARING);
      }).not.toThrow();
    });

    it('cho phép chuyển từ PREPARING sang READY', () => {
      expect(() => {
        stateMachine.assertTransition(OrderStatus.PREPARING, OrderStatus.READY);
      }).not.toThrow();
    });

    it('chặn chuyển từ PENDING sang PREPARING', () => {
      expect(() => {
        stateMachine.assertTransition(OrderStatus.PENDING, OrderStatus.PREPARING);
      }).toThrow(BadRequestException);
    });

    it('chặn hủy đơn khi đã COMPLETED', () => {
      expect(() => {
        stateMachine.assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED);
      }).toThrow(BadRequestException);
    });
  });

  describe('OrdersService.findByCode', () => {
    it('trả về đơn hàng khi tìm thấy theo mã ORD-1', async () => {
      const mockOrder = { id: 1, status: OrderStatus.PENDING, items: [] };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await ordersService.findByCode('ORD-1');

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { items: true },
      });
      expect(result).toEqual(mockOrder);
    });

    it('ném NotFoundException khi không tìm thấy đơn', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(ordersService.findByCode('ORD-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('OrdersService.findByUserId', () => {
    it('trả về danh sách đơn hàng của user', async () => {
      const mockOrders = [{ id: 1, userId: 1, status: OrderStatus.PENDING, items: [] }];
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await ordersService.findByUserId(1);

      expect(mockPrisma.order.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });

    it('trả về mảng rỗng [] khi user chưa có đơn nào', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await ordersService.findByUserId(99);

      expect(result).toEqual([]);
    });
  });
});
