import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersController } from '../src/orders/orders.controller.js';
import { OrdersService } from '../src/orders/orders.service.js';
import { OrderStateMachine, OrderStatus } from '../src/orders/order-state-machine.js';
import { ProductSize } from '../src/orders/dto/create-order.dto.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Integration & E2E Tests: Orders API (Task 5.2)', () => {
  let controller: OrdersController;
  let service: OrdersService;
  let stateMachine: OrderStateMachine;
  let mockPrisma: any;

  let mockDbOrders: Record<number, any> = {};
  const mockDbProducts: Record<number, any> = {
    1: { id: 1, name: 'Cà phê sữa đá', price: 35000, stock: 100, isAvailable: true },
    2: { id: 2, name: 'Trà đào cam sả', price: 45000, stock: 50, isAvailable: true },
  };

  beforeEach(() => {
    mockDbOrders = {};
    stateMachine = new OrderStateMachine();

    mockPrisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: 1, email: 'customer@brewlite.vn', fullName: 'Trần Việt Đức' }),
        findUnique: vi.fn().mockResolvedValue({ id: 1, email: 'customer@brewlite.vn', fullName: 'Trần Việt Đức' }),
      },
      product: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id?.in) {
            return where.id.in.map((id: number) => mockDbProducts[id]).filter(Boolean);
          }
          return Object.values(mockDbProducts);
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => mockDbProducts[where.id] || null),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          if (mockDbProducts[where.id]) {
            mockDbProducts[where.id].stock -= data.stock?.decrement || 0;
            return mockDbProducts[where.id];
          }
        }),
      },
      ingredient: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      promotion: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      order: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const id = Object.keys(mockDbOrders).length + 1;
          const created = {
            id,
            userId: data.userId || 1,
            subtotal: data.subtotal,
            discountAmount: data.discountAmount || 0,
            total: data.total,
            status: data.status || OrderStatus.PENDING,
            items: data.items?.create || [],
            createdAt: new Date(),
          };
          mockDbOrders[id] = created;
          return created;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id) {
            return mockDbOrders[where.id] || null;
          }
          return null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const order = mockDbOrders[where.id];
          if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
          if (data.status) order.status = data.status;
          return order;
        }),
      },
      $transaction: vi.fn(async (callback) => callback(mockPrisma)),
    };

    service = new OrdersService(mockPrisma, stateMachine);
    controller = new OrdersController(service);
  });

  describe('1. Integration Test: POST /orders - Tạo đơn hàng', () => {
    it('tạo đơn hàng thành công với sản phẩm, size và topping hợp lệ', async () => {
      const orderPayload = {
        items: [
          {
            productId: 1,
            productName: 'Cà phê sữa đá',
            quantity: 2,
            size: ProductSize.L, // +10,000đ/ly -> unitPrice = 45,000đ
            sweetness: '100%',
            ice: '100%',
            toppings: [
              { toppingId: 1, toppingName: 'Trân châu đen', price: 10000, quantity: 1 },
            ], // +10,000đ/ly -> 55,000đ * 2 = 110,000đ
          },
        ],
        customerNote: 'Ít ngọt, giao trước 10h',
      };

      const result = await controller.createOrder(orderPayload as any, { user: { id: 1 } });

      expect(result).toBeDefined();
      expect(result.orderCode).toMatch(/^ORD-\d+$/);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.total).toBe(110000);
      expect(result.subtotal).toBe(110000);
    });

    it('từ chối tạo đơn khi giỏ hàng trống (400 Bad Request)', async () => {
      await expect(
        controller.createOrder({ items: [] } as any, { user: { id: 1 } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Integration Test: GET /orders/:orderCode - Truy vấn chi tiết đơn hàng', () => {
    it('trả về chi tiết đơn hàng và trạng thái hiện tại', async () => {
      // Khởi tạo một đơn hàng mẫu
      const order = await controller.createOrder(
        {
          items: [
            {
              productId: 2,
              productName: 'Trà đào cam sả',
              quantity: 1,
              size: ProductSize.M,
              sweetness: '100%',
              ice: '100%',
              toppings: [],
            },
          ],
        } as any,
        { user: { id: 1 } },
      );

      const queried = await controller.getOrder(order.orderCode);
      expect(queried).toBeDefined();
      expect(queried.orderCode).toBe(order.orderCode);
      expect(queried.status).toBe(OrderStatus.PENDING);
      expect(queried.total).toBe(50000); // 45,000đ + 5,000đ (Size M) = 50,000đ
    });

    it('ném lỗi NotFoundException khi mã đơn không tồn tại (404)', async () => {
      await expect(controller.getOrder('ORD-999999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. Integration Test: PATCH /orders/:orderCode/status - Chuyển trạng thái đơn hàng', () => {
    it('cho phép chuyển trạng thái theo đúng luồng: PENDING -> PAID -> PREPARING -> READY -> COMPLETED', async () => {
      const order = await controller.createOrder(
        {
          items: [{ productId: 1, productName: 'Cà phê', quantity: 1, size: ProductSize.S, toppings: [] }],
        } as any,
        { user: { id: 1 } },
      );

      const step1 = await controller.updateStatus(order.orderCode, OrderStatus.PAID);
      expect(step1.status).toBe(OrderStatus.PAID);

      const step2 = await controller.updateStatus(order.orderCode, OrderStatus.PREPARING);
      expect(step2.status).toBe(OrderStatus.PREPARING);

      const step3 = await controller.updateStatus(order.orderCode, OrderStatus.READY);
      expect(step3.status).toBe(OrderStatus.READY);

      const step4 = await controller.updateStatus(order.orderCode, OrderStatus.COMPLETED);
      expect(step4.status).toBe(OrderStatus.COMPLETED);
    });

    it('chặn nhảy cóc trạng thái bất hợp lệ (PENDING -> PREPARING)', async () => {
      const order = await controller.createOrder(
        {
          items: [{ productId: 1, productName: 'Cà phê', quantity: 1, size: ProductSize.S, toppings: [] }],
        } as any,
        { user: { id: 1 } },
      );

      await expect(
        controller.updateStatus(order.orderCode, OrderStatus.PREPARING),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
