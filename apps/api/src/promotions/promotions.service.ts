import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { code } });
    if (!promo) {
      throw new NotFoundException(`Không tìm thấy mã khuyến mãi ${code}`);
    }
    return promo;
  }
}
