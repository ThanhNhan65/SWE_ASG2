import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { search?: string; isAvailable?: boolean }) {
    const where: {
      name?: { contains: string; mode: 'insensitive' };
      isAvailable?: boolean;
    } = {};

    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (typeof query?.isAvailable === 'boolean') {
      where.isAvailable = query.isAvailable;
    }

    return this.prisma.product.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findAllToppings() {
    return this.prisma.topping.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findAllIngredients() {
    return this.prisma.ingredient.findMany({
      orderBy: { id: 'asc' },
    });
  }
}
