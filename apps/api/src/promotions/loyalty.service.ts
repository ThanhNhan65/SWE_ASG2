import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPoints(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.loyaltyPoints || 0;
  }
}
