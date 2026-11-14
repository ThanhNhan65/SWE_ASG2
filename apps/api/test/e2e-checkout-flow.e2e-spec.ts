import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsController } from '../src/products/products.controller.js';
import { ProductsService } from '../src/products/products.service.js';
import { OrdersController } from '../src/orders/orders.controller.js';
import { OrdersService } from '../src/orders/orders.service.js';
import { OrderStateMachine, OrderStatus } from '../src/orders/order-state-machine.js';
import { PaymentsController } from '../src/payments/payments.controller.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { ProductSize } from '../src/orders/dto/create-order.dto.js';

describe('E2E Flow Test: Luồng nghiệp vụ trọn vẹn từ Menu đến Xác nhận đơn hàng (Task 5.2)', () => {
  let productsController: ProductsController;
  let productsService: ProductsService;
  let ordersController: OrdersController;
  let ordersService: OrdersService;
  let paymentsController: PaymentsController;
  let paymentsService: PaymentsService;
  let stateMachine: OrderStateMachine;

  // Giả lập cơ sở dữ liệu tích hợp trong bộ nhớ (In-Memory Integration DB)
  let dbProducts: Record<number, any>;
  let dbOrders: Record<number, any>;
  let dbPayments: Record<string, any>;
  let dbUser: any;

  beforeEach(() => {
    dbProducts = {
      1: { id: 1, name: 'Cà phê sữa đá', price: 35000, stock: 50, isAvailable: true },
      2: { id: 2, name: 'Trà đào cam sả', price: 45000, stock: 30, isAvailable: true },
    };
    dbOrders = {};
    dbPayments = {};
    dbUser = { id: 1, email: 'vietduc@brewlite.vn', fullName: 'Trần Việt Đức', loyaltyPoints: 20 };

    stateMachine = new OrderStateMachine();

    const mockPrisma: any = {
      user: {
        findFirst: vi.fn().mockResolvedValue(dbUser),
        findUnique: vi.fn().mockResolvedValue(dbUser),
        update: vi.fn().mockImplementation(async ({ data }: any) => {
          if (data.loyaltyPoints?.increment) {
            dbUser.loyaltyPoints += data.loyaltyPoints.increment;
          }
          return dbUser;
        }),
      },
      product: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id?.in) {
            return where.id.in.map((id: number) => dbProducts[id]).filter(Boolean);
          }
          return Object.values(dbProducts);
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => dbProducts[where.id] || null),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const p = dbProducts[where.id];
          if (p && data.stock?.decrement) {
            p.stock -= data.stock.decrement;
          }
          return p;
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
          const id = Object.keys(dbOrders).length + 1;
          const order = {
            id,
            userId: data.userId || 1,
            subtotal: data.subtotal,
            discountAmount: data.discountAmount || 0,
            total: data.total,
            pointsEarned: data.pointsEarned || 5,
            status: data.status || OrderStatus.PENDING,
            items: data.items?.create || [],
            createdAt: new Date(),
          };
          dbOrders[id] = order;
          return order;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id) return dbOrders[where.id] || null;
          return null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const order = dbOrders[where.id];
          if (order && data.status) order.status = data.status;
          return order;
        }),
      },
      payment: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.idempotencyKey) return dbPayments[where.idempotencyKey] || null;
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = {
            id: Object.keys(dbPayments).length + 1,
            ...data,
            createdAt: new Date(),
          };
          dbPayments[data.idempotencyKey] = record;
          return record;
        }),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    // Services
    productsService = new ProductsService(mockPrisma);
    productsController = new ProductsController(productsService);

    ordersService = new OrdersService(mockPrisma, stateMachine);
    ordersController = new OrdersController(ordersService);

    const mockWalletStrategy = {
      charge: vi.fn().mockResolvedValue({
        success: true,
        transactionRef: 'ZALOPAY-REF-998877',
      }),
    };
    const mockCardStrategy = {
      charge: vi.fn().mockResolvedValue({
        success: true,
        transactionRef: 'VNPAY-REF-112233',
      }),
    };

    paymentsService = new PaymentsService(
      mockPrisma,
      mockWalletStrategy as any,
      mockCardStrategy as any,
    );
    paymentsController = new PaymentsController(paymentsService);
  });

  it('hoàn thành trọn vẹn luồng: Xem Menu -> Chọn món/Tùy chọn -> Đặt hàng -> Thanh toán Ví -> Nhận mã xác nhận PAID', async () => {
    // -------------------------------------------------------------
    // Bước 1: Khách hàng mở thực đơn (Menu)
    // -------------------------------------------------------------
    const menu = await productsController.getAllProducts();
    expect(menu).toHaveLength(2);
    expect(menu[0].name).toBe('Cà phê sữa đá');

    // -------------------------------------------------------------
    // Bước 2: Khách hàng xem chi tiết món và chọn tùy biến
    // -------------------------------------------------------------
    const productDetail = await productsController.getProductById(1);
    expect(productDetail.id).toBe(1);
    expect(productDetail.isAvailable).toBe(true);

    // -------------------------------------------------------------
    // Bước 3: Đặt hàng từ giỏ hàng (POST /orders)
    // -------------------------------------------------------------
    const createdOrder = await ordersController.createOrder(
      {
        items: [
          {
            productId: 1,
            productName: 'Cà phê sữa đá',
            quantity: 1,
            size: ProductSize.L, // Giá gốc 35k + Size L 10k = 45k
            sweetness: '70%',
            ice: '50%',
            toppings: [
              { toppingId: 1, toppingName: 'Trân châu đen', price: 10000, quantity: 1 }, // +10k = 55k
            ],
          },
        ],
        customerNote: 'Giao giờ nghỉ trưa',
      } as any,
      { user: { id: 1 } },
    );

    expect(createdOrder.orderCode).toBe('ORD-1');
    expect(createdOrder.status).toBe(OrderStatus.PENDING);
    expect(createdOrder.total).toBe(55000);

    // -------------------------------------------------------------
    // Bước 4: Thanh toán không tiền mặt bằng Ví điện tử (POST /payments)
    // -------------------------------------------------------------
    const idempotencyKey = 'e2e-flow-key-order-1';
    const paymentResult = await paymentsController.createPayment({
      orderId: createdOrder.id,
      method: PaymentMethod.WALLET,
      idempotencyKey,
      mockSuccess: true,
    } as any);

    expect(paymentResult.success).toBe(true);
    expect(paymentResult.isIdempotent).toBe(false);
    expect(paymentResult.orderStatus).toBe(OrderStatus.PAID);
    expect(paymentResult.payment.status).toBe(PaymentStatus.SUCCESS);

    // -------------------------------------------------------------
    // Bước 5: Khách hàng kiểm tra xác nhận trạng thái đơn (GET /orders/:orderCode)
    // -------------------------------------------------------------
    const confirmedOrder = await ordersController.getOrder(createdOrder.orderCode);
    expect(confirmedOrder.orderCode).toBe('ORD-1');
    expect(confirmedOrder.status).toBe(OrderStatus.PAID);
    expect(confirmedOrder.total).toBe(55000);

    // Điểm thưởng thành viên được cộng sau khi thanh toán thành công
    expect(dbUser.loyaltyPoints).toBe(25); // 20 ban đầu + 5 tích lũy
  });
});
