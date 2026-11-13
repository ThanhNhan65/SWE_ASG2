import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ProductFilterDto {
  isAvailable?: boolean;
  search?: string;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách sản phẩm thực đơn (hỗ trợ lọc trạng thái và tìm kiếm)
   */
  async findAll(filter?: ProductFilterDto) {
    try {
      const where: {
        isAvailable?: boolean;
        name?: { contains: string; mode: 'insensitive' };
      } = {};

      if (filter?.isAvailable !== undefined) {
        where.isAvailable = filter.isAvailable;
      }

      if (filter?.search && filter.search.trim() !== '') {
        where.name = {
          contains: filter.search.trim(),
          mode: 'insensitive',
        };
      }

      const products = await this.prisma.product.findMany({
        where: Object.keys(where).length > 0 || filter ? where : undefined,
        orderBy: { id: 'asc' },
      });

      return products;
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy danh sách sản phẩm: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Lấy chi tiết một sản phẩm theo ID
   */
  async findById(id: number) {
    if (!id || isNaN(id) || id <= 0) {
      throw new BadRequestException('ID sản phẩm không hợp lệ. ID phải là số nguyên dương.');
    }

    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
      }

      return product;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Lỗi khi truy vấn sản phẩm #${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Alias tương thích với Vinh branch & BrewLite 1
   */
  async findOne(id: number) {
    return this.findById(id);
  }

  /**
   * Lấy danh sách Topping đi kèm cho thực đơn
   */
  async getToppings() {
    try {
      return await this.prisma.topping.findMany({
        where: { isAvailable: true },
        orderBy: { id: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy danh sách topping: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
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
