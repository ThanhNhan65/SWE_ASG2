import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStateMachine, OrderStatus } from './order-state-machine';
import { CreateOrderDto, ProductSize } from './dto/create-order.dto';

const SIZE_EXTRA_PRICE: Record<ProductSize, number> = {
  [ProductSize.S]: 0,
  [ProductSize.M]: 5000,
  [ProductSize.L]: 10000,
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: OrderStateMachine,
  ) {}

  /**
   * Task 5.4: Tạo đơn hàng từ giỏ hàng
   * - Validate sản phẩm, số lượng, tính khả dụng và tồn kho
   * - Tính tổng tiền chuẩn xác phía Backend (chống gian lận giá)
   * - Xử lý mã khuyến mãi (nếu có)
   * - Thực thi Transaction trừ tồn kho và tạo Order + OrderItem
   */
  async createOrder(dto: CreateOrderDto, authUserId?: number | string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng không được để trống khi đặt hàng.');
    }

    // 1. Xác định User đặt hàng
    let userId = authUserId ? Number(authUserId) : dto.userId ? Number(dto.userId) : null;
    if (!userId) {
      // Fallback lấy tài khoản khách hàng mặc định (customer@brewlite.vn)
      const defaultUser = await this.prisma.user.findFirst();
      if (!defaultUser) {
        throw new NotFoundException('Hệ thống chưa có tài khoản khách hàng để tạo đơn.');
      }
      userId = defaultUser.id;
    } else {
      const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        throw new NotFoundException(`Không tìm thấy tài khoản người dùng với ID: ${userId}`);
      }
    }

    // 2. Lấy thông tin các sản phẩm từ database
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Validate sản phẩm, trạng thái phục vụ & kiểm tra tồn kho
    const orderItemsData: Array<{
      productId: number;
      size: ProductSize;
      sweetness: string;
      ice: string;
      toppings: any;
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

      // 4. Tính toán giá tiền phía Backend
      const size = item.size || ProductSize.M;
      const sizePrice = SIZE_EXTRA_PRICE[size] ?? 5000;
      const toppingsPrice = Array.isArray(item.toppings)
        ? item.toppings.reduce((sum, t) => sum + (Number(t?.price) || 0), 0)
        : 0;

      const unitPrice = product.price + sizePrice + toppingsPrice;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        productId: product.id,
        size,
        sweetness: item.sweetness || '100%',
        ice: item.ice || 'Bình thường',
        toppings: item.toppings || [],
        unitPrice,
        qty: item.quantity,
        lineTotal,
      });
    }

    // 5. Kiểm tra & áp dụng mã khuyến mãi (nếu có)
    let discountAmount = 0;
    let appliedPromotion: any = null;

    if (dto.promotionCode && dto.promotionCode.trim()) {
      const promoCode = dto.promotionCode.trim().toUpperCase();
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
        discountAmount = Math.round(subtotal * (promo.discountValue / 100));
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
          discountAmount = promo.maxDiscount;
        }
      } else if (promo.discountType === 'FIXED') {
        discountAmount = Math.min(promo.discountValue, subtotal);
      }

      appliedPromotion = promo;
    }

    const total = Math.max(0, subtotal - discountAmount);
    const pointsEarned = Math.floor(total / 1000); // Tích 1 điểm cho mỗi 1.000 VNĐ

    // 6. Thực thi Transaction đảm bảo tính ACID
    const newOrder = await this.prisma.$transaction(async (tx) => {
      // 6.1. Trừ tồn kho sản phẩm
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
      }

      // 6.2. Cập nhật lượt dùng khuyến mãi nếu có
      if (appliedPromotion) {
        await tx.promotion.update({
          where: { id: appliedPromotion.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // 6.3. Tạo Order và các OrderItem
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

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: nextStatus },
      include: { items: true },
    });

    return {
      orderCode: `ORD-${updated.id}`,
      ...updated,
    };
  }
}
