import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma, Promotion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStateMachine, OrderStatus } from './order-state-machine.js';
import { CreateOrderDto, ProductSize } from './dto/create-order.dto.js';
import { calculateSugarAndIceConsumption } from '../products/sugar-ice.calculator.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import {
  LOYALTY_CONSTANTS,
  LoyaltyPointsService,
} from '../promotions/loyalty.service.js';

const SIZE_EXTRA_PRICE: Record<ProductSize, number> = {
  [ProductSize.S]: 0,
  [ProductSize.M]: 5000,
  [ProductSize.L]: 10000,
};

interface ToppingPayloadItem {
  name?: string;
  price?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: OrderStateMachine,
    @Optional() private readonly promotionsService?: PromotionsService,
    @Optional() private readonly loyaltyService?: LoyaltyPointsService,
  ) {}

  /**
   * Task 5.4: Tạo đơn hàng từ giỏ hàng
   * - Validate sản phẩm, số lượng, tính khả dụng và tồn kho món
   * - Kiểm tra định mức nguyên liệu (hạt cà phê, trà, sữa, đường, đá)
   * - Tính tổng tiền chuẩn xác phía Backend (chống gian lận giá)
   * - Xử lý mã khuyến mãi & điểm thưởng (nếu có)
   * - Thực thi Transaction trừ tồn kho món, trừ nguyên liệu, trừ điểm và tạo Order + OrderItem
   */
  async createOrder(dto: CreateOrderDto, authUserId?: number | string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng không được để trống khi đặt hàng.');
    }

    // 1. Xác định User đặt hàng
    let userId = authUserId ? Number(authUserId) : dto.userId ? Number(dto.userId) : null;
    let userAvailablePoints = 0;

    if (!userId) {
      const defaultUser = await this.prisma.user.findFirst();
      if (!defaultUser) {
        throw new NotFoundException('Hệ thống chưa có tài khoản khách hàng để tạo đơn.');
      }
      userId = defaultUser.id;
      userAvailablePoints = defaultUser.loyaltyPoints ?? 0;
    } else {
      const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        throw new NotFoundException(`Không tìm thấy tài khoản người dùng với ID: ${userId}`);
      }
      userAvailablePoints = userExists.loyaltyPoints ?? 0;
    }

    // 2. Lấy thông tin các sản phẩm từ database
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Validate sản phẩm, trạng thái phục vụ & kiểm tra tồn kho món
    const orderItemsData: Array<{
      productId: number;
      size: ProductSize;
      sweetness: string;
      ice: string;
      toppings: Prisma.InputJsonValue;
      unitPrice: number;
      qty: number;
      lineTotal: number;
    }> = [];

    let subtotal = 0;

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Sản phẩm với ID ${item.productId} không tồn tại.`);
      }

      if (!product.isAvailable) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" hiện đang tạm ngừng phục vụ.`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" chỉ còn ${product.stock} phần trong kho, không đủ đáp ứng số lượng yêu cầu (${item.quantity}).`,
        );
      }

      const size = item.size || ProductSize.M;
      const sizePrice = SIZE_EXTRA_PRICE[size] ?? 5000;
      const toppingsPrice = Array.isArray(item.toppings)
        ? (item.toppings as ToppingPayloadItem[]).reduce(
            (sum, t) => sum + (Number(t?.price) || 0),
            0,
          )
        : 0;

      const unitPrice = product.price + sizePrice + toppingsPrice;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        productId: product.id,
        size,
        sweetness: item.sweetness || '100%',
        ice: item.ice || 'Bình thường',
        toppings: (item.toppings || []) as Prisma.InputJsonValue,
        unitPrice,
        qty: item.quantity,
        lineTotal,
      });
    }

    // 4. Kiểm tra định mức tiêu thụ nguyên liệu (Cà phê, Trà, Sữa, Đường, Đá)
    const consumption = calculateSugarAndIceConsumption(
      dto.items.map((item) => {
        const prod = productMap.get(item.productId);
        return {
          productId: item.productId,
          productName: prod?.name || String(item.productId),
          size: item.size || 'M',
          sweetness: item.sweetness,
          ice: item.ice,
          qty: item.quantity,
        };
      }),
    );

    try {
      const prismaWithIngredient = this.prisma as unknown as {
        ingredient?: {
          findUnique?: (args: { where: { code: string } }) => Promise<{ stock: number } | null>;
        };
      };
      if (prismaWithIngredient?.ingredient?.findUnique) {
        const [coffeeRecord, teaRecord, milkRecord, sugarRecord, iceRecord] = await Promise.all([
          prismaWithIngredient.ingredient.findUnique({ where: { code: 'COFFEE_BEANS' } }),
          prismaWithIngredient.ingredient.findUnique({ where: { code: 'TEA_LEAVES' } }),
          prismaWithIngredient.ingredient.findUnique({ where: { code: 'MILK' } }),
          prismaWithIngredient.ingredient.findUnique({ where: { code: 'SUGAR' } }),
          prismaWithIngredient.ingredient.findUnique({ where: { code: 'ICE' } }),
        ]);

        if (coffeeRecord && consumption.totalCoffeeGrams > 0 && coffeeRecord.stock < consumption.totalCoffeeGrams) {
          throw new BadRequestException(
            `Kho không đủ hạt cà phê để pha chế (còn ${Math.floor(coffeeRecord.stock)}g, cần ${consumption.totalCoffeeGrams}g).`,
          );
        }
        if (teaRecord && consumption.totalTeaGrams > 0 && teaRecord.stock < consumption.totalTeaGrams) {
          throw new BadRequestException(
            `Kho không đủ lá trà để pha chế (còn ${Math.floor(teaRecord.stock)}g, cần ${consumption.totalTeaGrams}g).`,
          );
        }
        if (milkRecord && consumption.totalMilkMl > 0 && milkRecord.stock < consumption.totalMilkMl) {
          throw new BadRequestException(
            `Kho không đủ sữa để pha chế (còn ${Math.floor(milkRecord.stock)}ml, cần ${consumption.totalMilkMl}ml).`,
          );
        }
        if (sugarRecord && consumption.totalSugarGrams > 0 && sugarRecord.stock < consumption.totalSugarGrams) {
          throw new BadRequestException(
            `Kho không đủ đường để pha chế (còn ${Math.floor(sugarRecord.stock)}g, cần ${consumption.totalSugarGrams}g).`,
          );
        }
        if (iceRecord && consumption.totalIceGrams > 0 && iceRecord.stock < consumption.totalIceGrams) {
          throw new BadRequestException(
            `Kho không đủ đá để pha chế (còn ${Math.floor(iceRecord.stock)}g, cần ${consumption.totalIceGrams}g).`,
          );
        }
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
    }

    // 5. Kiểm tra & áp dụng mã khuyến mãi (hỗ trợ cả promotionCode và promoCode)
    let promoDiscount = 0;
    let appliedPromotion: Promotion | null = null;
    const rawPromoCode = (dto.promotionCode ?? dto.promoCode)?.trim();

    if (rawPromoCode) {
      if (this.promotionsService) {
        const promoResult = await this.promotionsService.validateAndCalculate(
          rawPromoCode,
          subtotal,
        );
        promoDiscount = promoResult.discountAmount;
        appliedPromotion = promoResult.promotion;
      } else {
        const promoCode = rawPromoCode.toUpperCase();
        const promo = await this.prisma.promotion.findUnique({
          where: { code: promoCode },
        });

        if (!promo || !promo.isActive) {
          throw new BadRequestException(`Mã khuyến mãi "${promoCode}" không tồn tại hoặc đã bị vô hiệu hóa.`);
        }

        if (new Date() > promo.expiredAt) {
          throw new BadRequestException(`Mã khuyến mãi "${promoCode}" đã hết hạn sử dụng.`);
        }

        if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
          throw new BadRequestException(`Mã khuyến mãi "${promoCode}" đã hết lượt sử dụng.`);
        }

        if (subtotal < promo.minOrderValue) {
          throw new BadRequestException(
            `Đơn hàng tối thiểu phải từ ${promo.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã "${promoCode}".`,
          );
        }

        if (promo.discountType === 'PERCENTAGE') {
          promoDiscount = Math.round(subtotal * (promo.discountValue / 100));
          if (promo.maxDiscount && promoDiscount > promo.maxDiscount) {
            promoDiscount = promo.maxDiscount;
          }
        } else if (promo.discountType === 'FIXED') {
          promoDiscount = Math.min(promo.discountValue, subtotal);
        }

        appliedPromotion = promo;
      }
    }

    // 5.5. Kiểm tra & tính toán giảm giá từ điểm thưởng (Loyalty Points)
    const remainingAfterPromo = Math.max(0, subtotal - promoDiscount);
    let pointsDiscount = 0;
    let pointsActuallyUsed = 0;

    if (dto.pointsToUse && dto.pointsToUse > 0) {
      if (this.loyaltyService) {
        const pointsResult = this.loyaltyService.calculatePointsDiscount(
          dto.pointsToUse,
          remainingAfterPromo,
          userAvailablePoints,
        );
        pointsDiscount = pointsResult.discountAmount;
        pointsActuallyUsed = pointsResult.pointsActuallyUsed;
      } else {
        if (!Number.isInteger(dto.pointsToUse)) {
          throw new BadRequestException('Số điểm sử dụng phải là số nguyên dương');
        }
        if (dto.pointsToUse > userAvailablePoints) {
          throw new BadRequestException(
            `Số điểm sử dụng (${dto.pointsToUse} điểm) vượt quá số điểm khả dụng của bạn (${userAvailablePoints} điểm)`,
          );
        }
        const potentialDiscount = dto.pointsToUse * LOYALTY_CONSTANTS.POINT_VALUE_IN_VND;
        if (potentialDiscount > remainingAfterPromo) {
          pointsDiscount = remainingAfterPromo;
          pointsActuallyUsed = Math.ceil(pointsDiscount / LOYALTY_CONSTANTS.POINT_VALUE_IN_VND);
        } else {
          pointsDiscount = potentialDiscount;
          pointsActuallyUsed = dto.pointsToUse;
        }
      }
    }

    const discountAmount = promoDiscount + pointsDiscount;
    const total = Math.max(0, subtotal - discountAmount);
    const pointsEarned = this.loyaltyService
      ? this.loyaltyService.calculatePointsEarned(total)
      : Math.floor(total / LOYALTY_CONSTANTS.VND_PER_EARNED_POINT);

    // 6. Thực thi Transaction đảm bảo tính ACID
    const newOrder = await this.prisma.$transaction(async (tx) => {
      // 6.1. Trừ tồn kho sản phẩm (Optimistic Locking)
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
      }

      // 6.2. Trừ tồn kho nguyên liệu tương ứng nếu có
      await this.adjustIngredientStockInTx(tx, consumption, 'decrement');

      // 6.3. Cập nhật lượt dùng khuyến mãi nếu có
      if (appliedPromotion) {
        await tx.promotion.update({
          where: { id: appliedPromotion.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // 6.4. Trừ điểm thưởng đã sử dụng nếu có
      if (pointsActuallyUsed > 0) {
        if (this.loyaltyService) {
          await this.loyaltyService.deductPointsInTransaction(tx, userId, pointsActuallyUsed);
        } else {
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { decrement: pointsActuallyUsed } },
          });
        }
      }

      // 6.5. Tạo Order và các OrderItem
      return tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount,
          total,
          pointsEarned,
          promotionId: appliedPromotion?.id || null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, imageUrl: true },
              },
            },
          },
          promotion: true,
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
      });
    });

    return {
      message: 'Tạo đơn hàng thành công',
      orderCode: `ORD-${newOrder.id}`,
      ...newOrder,
    };
  }

  async findByUserId(userId: string | number, status?: OrderStatus) {
    const uId = Number(userId);
    return this.prisma.order.findMany({
      where: {
        userId: uId,
        ...(status ? { status } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, imageUrl: true },
            },
          },
        },
        promotion: true,
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
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: { id: true, email: true, fullName: true },
        },
        promotion: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã: ${orderCode}`);
    }

    return {
      orderCode: `ORD-${order.id}`,
      ...order,
    };
  }

  async transitionOrderStatus(orderCode: string, nextStatus: OrderStatus) {
    const order = await this.findByCode(orderCode);

    if (order.status === nextStatus) {
      return order;
    }

    this.stateMachine.assertTransition(order.status as OrderStatus, nextStatus);

    const isCancellingActiveOrder =
      nextStatus === OrderStatus.CANCELLED &&
      (order.status === OrderStatus.PAID ||
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.PAYMENT_FAILED);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (isCancellingActiveOrder && Array.isArray(order.items) && order.items.length > 0) {
        // Hoàn lại tồn kho sản phẩm
        for (const item of order.items) {
          try {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.qty },
                version: { increment: 1 },
              },
            });
          } catch {
            // Bỏ qua nếu sản phẩm không còn tồn tại trong DB
          }
        }

        // Hoàn lại nguyên liệu cốt, đường, đá, sữa
        const consumption = calculateSugarAndIceConsumption(
          order.items.map((item) => ({
            productId: item.productId,
            productName: item.product?.name || String(item.productId),
            size: item.size || 'M',
            sweetness: item.sweetness,
            ice: item.ice,
            qty: item.qty,
          })),
        );
        await this.adjustIngredientStockInTx(tx, consumption, 'increment');

        // Hoàn lại tồn kho topping khi hủy đơn đã thanh toán
        if (order.status === OrderStatus.PAID) {
          await this.restoreToppingStockInTx(tx, order.items);
        }
      }

      return tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, imageUrl: true },
              },
            },
          },
          promotion: true,
        },
      });
    });

    return {
      orderCode: `ORD-${updated.id}`,
      ...updated,
    };
  }

  private async adjustIngredientStockInTx(
    tx: Prisma.TransactionClient,
    consumption: ReturnType<typeof calculateSugarAndIceConsumption>,
    direction: 'increment' | 'decrement',
  ): Promise<void> {
    try {
      const txWithIngredient = tx as unknown as {
        ingredient?: {
          update?: (args: {
            where: { code: string };
            data: { stock: { increment?: number; decrement?: number } };
          }) => Promise<unknown>;
        };
      };
      if (!txWithIngredient?.ingredient?.update) return;

      const pairs: Array<[string, number]> = [
        ['COFFEE_BEANS', consumption.totalCoffeeGrams],
        ['TEA_LEAVES', consumption.totalTeaGrams],
        ['MILK', consumption.totalMilkMl],
        ['SUGAR', consumption.totalSugarGrams],
        ['ICE', consumption.totalIceGrams],
      ];

      for (const [code, amount] of pairs) {
        if (amount > 0) {
          await txWithIngredient.ingredient.update({
            where: { code },
            data: {
              stock: direction === 'increment' ? { increment: amount } : { decrement: amount },
            },
          });
        }
      }
    } catch {
      // Bỏ qua nếu bảng ingredient chưa sẵn sàng hoặc thiếu bản ghi
    }
  }

  private async restoreToppingStockInTx(
    tx: Prisma.TransactionClient,
    items: Array<{ qty: number; toppings: Prisma.JsonValue }>,
  ): Promise<void> {
    const toppingCounts = new Map<string, number>();

    for (const item of items) {
      if (!Array.isArray(item.toppings)) continue;
      for (const rawTopping of item.toppings) {
        const toppingName =
          typeof rawTopping === 'string'
            ? rawTopping
            : typeof rawTopping === 'object' &&
                rawTopping !== null &&
                'name' in rawTopping &&
                typeof (rawTopping as { name?: unknown }).name === 'string'
              ? (rawTopping as { name: string }).name
              : undefined;

        if (toppingName) {
          toppingCounts.set(toppingName, (toppingCounts.get(toppingName) || 0) + item.qty);
        }
      }
    }

    for (const [toppingName, count] of toppingCounts.entries()) {
      try {
        const existingTopping = await tx.topping.findFirst({
          where: { name: { equals: toppingName, mode: 'insensitive' } },
        });
        if (existingTopping) {
          const newStock = existingTopping.stock + count;
          await tx.topping.update({
            where: { id: existingTopping.id },
            data: {
              stock: newStock,
              isAvailable: newStock > 0,
            },
          });
        }
      } catch {
        // Bỏ qua nếu lỗi DB topping không chặn giao dịch hủy đơn
      }
    }
  }
}
