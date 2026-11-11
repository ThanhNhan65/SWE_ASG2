import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersService } from './orders.service';
import { OrderStateMachine, OrderStatus } from './order-state-machine';
import { ProductSize } from './dto/create-order.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService & OrderStateMachine (Task 5.4)', () => {
  let ordersService: OrdersService;
  let stateMachine: OrderStateMachine;
  let mockPrisma: any;

  beforeEach(() => {
    stateMachine = new OrderStateMachine();

    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      promotion: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      order: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (callback) => callback(mockPrisma)),
    };

    ordersService = new OrdersService(mockPrisma, stateMachine);
  });

  describe('1. Logic Chuyển Trạng Thái (OrderStateMachine)', () => {
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

    it('chặn chuyển từ PENDING sang PREPARING khi chưa thanh toán', () => {
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

  describe('2. Quy Trình Tạo Đơn Hàng (OrdersService.createOrder)', () => {
    it('chặn lỗi khi giỏ hàng rỗng', async () => {
      await expect(
        ordersService.createOrder({ items: [] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn lỗi khi sản phẩm không tồn tại trong CSDL', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.product.findMany.mockResolvedValue([]); // Không tìm thấy

      await expect(
        ordersService.createOrder({
          userId: 1,
          items: [{ productId: 999, quantity: 1, size: ProductSize.M }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('chặn lỗi khi sản phẩm tạm ngưng phục vụ (isAvailable = false)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Cà phê sữa', price: 35000, stock: 10, isAvailable: false },
      ]);

      await expect(
        ordersService.createOrder({
          userId: 1,
          items: [{ productId: 1, quantity: 1, size: ProductSize.M }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn lỗi khi số lượng đặt vượt quá tồn kho', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Cà phê sữa', price: 35000, stock: 2, isAvailable: true },
      ]);

      await expect(
        ordersService.createOrder({
          userId: 1,
          items: [{ productId: 1, quantity: 5, size: ProductSize.M }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('tạo đơn hàng thành công, tính đúng tiền, trừ tồn kho và trạng thái PENDING', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@brewlite.vn' });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Cà phê sữa', price: 35000, stock: 20, isAvailable: true },
      ]);
      mockPrisma.order.create.mockImplementation(async ({ data }: any) => ({
        id: 10,
        ...data,
      }));

      const result = await ordersService.createOrder({
        userId: 1,
        items: [
          {
            productId: 1,
            size: ProductSize.M, // Phụ thu size M: 5000 -> unitPrice = 40,000
            quantity: 2,        // 2 x 40,000 = 80,000
          },
        ],
      });

      expect(result.orderCode).toBe('ORD-10');
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.subtotal).toBe(80000);
      expect(result.total).toBe(80000);

      // Đảm bảo có gọi lệnh trừ tồn kho trong transaction
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          stock: { decrement: 2 },
          version: { increment: 1 },
        },
      });
    });

    it('áp dụng mã khuyến mãi thành công và tính đúng tiền giảm giá', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@brewlite.vn' });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 1, name: 'Americano', price: 40000, stock: 50, isAvailable: true },
      ]);
      mockPrisma.promotion.findUnique.mockResolvedValue({
        id: 5,
        code: 'BREWLITE20',
        discountType: 'PERCENTAGE',
        discountValue: 20, // Giảm 20%
        minOrderValue: 40000,
        maxDiscount: 20000,
        usageLimit: 100,
        usedCount: 0,
        isActive: true,
        expiredAt: new Date(Date.now() + 86400000),
      });

      mockPrisma.order.create.mockImplementation(async ({ data }: any) => ({
        id: 11,
        ...data,
      }));

      const result = await ordersService.createOrder({
        userId: 1,
        items: [
          {
            productId: 1,
            size: ProductSize.S, // Size S phụ thu 0 -> unitPrice = 40,000
            quantity: 2,        // subtotal = 80,000
          },
        ],
        promotionCode: 'BREWLITE20',
      });

      // 80,000 x 20% = 16,000
      expect(result.subtotal).toBe(80000);
      expect(result.discountAmount).toBe(16000);
      expect(result.total).toBe(64000);
      expect(mockPrisma.promotion.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { usedCount: { increment: 1 } },
      });
    });
  });
});
