import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsController } from '../src/payments/payments.controller.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('Integration & E2E Tests: Payments API & Idempotency (Task 5.2)', () => {
  let controller: PaymentsController;
  let service: PaymentsService;
  let mockPrisma: any;
  let mockWalletStrategy: any;
  let mockCardStrategy: any;

  let mockPaymentsDb: Record<string, any> = {};
  let mockOrdersDb: Record<number, any> = {};

  beforeEach(() => {
    mockPaymentsDb = {};
    mockOrdersDb = {
      101: {
        id: 101,
        userId: 1,
        total: 55000,
        status: OrderStatus.PENDING,
        pointsEarned: 5,
      },
      102: {
        id: 102,
        userId: 1,
        total: 90000,
        status: OrderStatus.PENDING,
        pointsEarned: 9,
      },
      103: {
        id: 103,
        userId: 2,
        total: 120000,
        status: OrderStatus.PAID, // Đã thanh toán
        pointsEarned: 12,
      },
    };

    mockWalletStrategy = {
      charge: vi.fn().mockImplementation(async (amount, mockSuccess) => ({
        success: mockSuccess ?? true,
        transactionRef: 'WAL-TX-' + Math.floor(Math.random() * 100000),
      })),
    };

    mockCardStrategy = {
      charge: vi.fn().mockImplementation(async (amount, mockSuccess) => ({
        success: mockSuccess ?? true,
        transactionRef: 'CARD-TX-' + Math.floor(Math.random() * 100000),
      })),
    };

    mockPrisma = {
      payment: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.idempotencyKey) {
            return mockPaymentsDb[where.idempotencyKey] || null;
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = {
            id: Object.keys(mockPaymentsDb).length + 1,
            ...data,
            createdAt: new Date(),
          };
          mockPaymentsDb[data.idempotencyKey] = record;
          return record;
        }),
      },
      order: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return mockOrdersDb[where.id] || null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const order = mockOrdersDb[where.id];
          if (order && data.status) {
            order.status = data.status;
          }
          return order;
        }),
      },
      user: {
        update: vi.fn().mockResolvedValue({ id: 1, loyaltyPoints: 10 }),
      },
      $transaction: vi.fn(async (callback) => callback(mockPrisma)),
    };

    service = new PaymentsService(
      mockPrisma as any,
      mockWalletStrategy as any,
      mockCardStrategy as any,
    );
    controller = new PaymentsController(service);
  });

  describe('1. Integration Test: POST /payments - Thanh toán ví điện tử (WALLET)', () => {
    it('thanh toán thành công qua ví điện tử: cập nhật Payment=SUCCESS và Order=PAID', async () => {
      const payload = {
        orderId: 101,
        method: PaymentMethod.WALLET,
        idempotencyKey: 'idem-wallet-test-001',
        mockSuccess: true,
      };

      const result = await controller.createPayment(payload as any);

      expect(result.success).toBe(true);
      expect(result.isIdempotent).toBe(false);
      expect(result.orderStatus).toBe(OrderStatus.PAID);
      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(result.payment.method).toBe(PaymentMethod.WALLET);
      expect(mockWalletStrategy.charge).toHaveBeenCalledWith(55000, true, expect.any(Object));
    });
  });

  describe('2. Integration Test: POST /payments - Thanh toán thẻ ngân hàng (CARD)', () => {
    it('thanh toán thành công qua thẻ ngân hàng: cập nhật Payment=SUCCESS và Order=PAID', async () => {
      const payload = {
        orderId: 102,
        method: PaymentMethod.CARD,
        idempotencyKey: 'idem-card-test-002',
        mockSuccess: true,
      };

      const result = await controller.createPayment(payload as any);

      expect(result.success).toBe(true);
      expect(result.isIdempotent).toBe(false);
      expect(result.orderStatus).toBe(OrderStatus.PAID);
      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(result.payment.method).toBe(PaymentMethod.CARD);
      expect(mockCardStrategy.charge).toHaveBeenCalledWith(90000, true, expect.any(Object));
    });
  });

  describe('3. Integration Test: Cơ chế Idempotency chống trừ tiền trùng lặp', () => {
    it('gửi lại cùng idempotencyKey trả về kết quả cũ và không trừ tiền lần hai', async () => {
      const key = 'idem-duplicate-check-003';
      const payload = {
        orderId: 101,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
        mockSuccess: true,
      };

      // Giao dịch lần đầu
      const firstCall = await controller.createPayment(payload as any);
      expect(firstCall.isIdempotent).toBe(false);
      expect(firstCall.success).toBe(true);

      // Cập nhật quan hệ payment -> order cho mock DB
      mockPaymentsDb[key].order = mockOrdersDb[101];

      // Giao dịch lần 2 với cùng idempotencyKey (ví dụ do bấm nút 2 lần hoặc mạng chậm)
      const secondCall = await controller.createPayment(payload as any);
      expect(secondCall.isIdempotent).toBe(true);
      expect(secondCall.success).toBe(true);
      expect(secondCall.orderId).toBe(101);
      // Kiểm tra charge strategy chỉ được gọi 1 lần duy nhất
      expect(mockWalletStrategy.charge).toHaveBeenCalledTimes(1);
    });

    it('báo lỗi Conflict (409) khi dùng lại idempotencyKey cho một đơn hàng khác', async () => {
      const key = 'idem-conflict-key-004';
      const payload1 = {
        orderId: 101,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
      };
      await controller.createPayment(payload1 as any);
      mockPaymentsDb[key].order = mockOrdersDb[101];

      // Thử dùng lại key đó cho orderId 102
      const payload2 = {
        orderId: 102,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
      };

      await expect(controller.createPayment(payload2 as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('4. Integration Test: Xử lý ngoại lệ và thanh toán thất bại', () => {
    it('khi cổng thanh toán trả về thất bại: cập nhật Order=PAYMENT_FAILED và giữ giỏ hàng', async () => {
      const payload = {
        orderId: 101,
        method: PaymentMethod.WALLET,
        idempotencyKey: 'idem-fail-test-005',
        mockSuccess: false, // Giả lập thanh toán lỗi
      };

      const result = await controller.createPayment(payload as any);

      expect(result.success).toBe(false);
      expect(result.orderStatus).toBe(OrderStatus.PAYMENT_FAILED);
      expect(result.payment.status).toBe(PaymentStatus.FAILED);
      expect(mockOrdersDb[101].status).toBe(OrderStatus.PAYMENT_FAILED);
    });

    it('từ chối thanh toán khi đơn hàng đã thanh toán (Order=PAID)', async () => {
      const payload = {
        orderId: 103, // Order 103 đã PAID
        method: PaymentMethod.WALLET,
        idempotencyKey: 'idem-paid-order-006',
      };

      await expect(controller.createPayment(payload as any)).rejects.toThrow(BadRequestException);
    });

    it('từ chối yêu cầu thanh toán thiếu Idempotency Key', async () => {
      const payload = {
        orderId: 101,
        method: PaymentMethod.WALLET,
        idempotencyKey: '',
      };

      await expect(controller.createPayment(payload as any)).rejects.toThrow(BadRequestException);
    });
  });
});
