import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  calculateAvailableCupsByIngredients,
  isProductAvailableByIngredients,
} from './sugar-ice.calculator.js';

export interface ProductFilterDto {
  isAvailable?: boolean;
  search?: string;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  // Danh sách nguyên liệu trong bộ nhớ (In-memory fallback & đồng bộ DB giống DOAN_SWE)
  private static inMemoryIngredients = [
    { code: 'SUGAR', name: 'Đường cát tinh luyện', stock: 20000, unit: 'g', minThreshold: 1000 },
    { code: 'ICE', name: 'Đá viên tinh khiết', stock: 50000, unit: 'g', minThreshold: 2000 },
    { code: 'COFFEE_BEANS', name: 'Hạt cà phê Robusta rang mộc', stock: 5000, unit: 'g', minThreshold: 500 },
    { code: 'TEA_LEAVES', name: 'Lá trà Oolong & Trà đen khô', stock: 3000, unit: 'g', minThreshold: 300 },
    { code: 'MILK', name: 'Sữa tươi & Sữa đặc pha chế', stock: 10000, unit: 'ml', minThreshold: 1000 },
  ];

  static getInMemoryIngredientStock(code: string): number {
    const ing = ProductsService.inMemoryIngredients.find((i) => i.code === code);
    return ing ? ing.stock : 999999;
  }

  /**
   * Kiểm tra một sản phẩm có đủ nguyên liệu tối thiểu (Size S) để bán hay không
   */
  static isProductAvailableByStock(
    productName: string,
    coffeeStock: number,
    teaStock: number,
    milkStock: number = 999999,
  ): boolean {
    return isProductAvailableByIngredients(productName, coffeeStock, teaStock, milkStock);
  }

  /**
   * Tính toán số ly tồn kho tối đa của một sản phẩm từ lượng nguyên liệu thô theo công thức Recipe chuẩn
   */
  static calculateProductStock(
    productName: string,
    coffeeStock: number,
    teaStock: number,
    milkStock: number = 999999,
    size: 'S' | 'M' | 'L' = 'S',
  ): number {
    return calculateAvailableCupsByIngredients(
      productName,
      { coffee: coffeeStock, tea: teaStock, milk: milkStock },
      size,
    );
  }

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách sản phẩm thực đơn (hỗ trợ lọc trạng thái, tìm kiếm và tính stock động theo nguyên liệu)
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

      const prismaWithIng = this.prisma as unknown as {
        ingredient?: {
          findMany?: () => Promise<Array<{ code: string; stock: number }>>;
        };
      };

      const [products, ingList] = await Promise.all([
        this.prisma.product.findMany({
          where: Object.keys(where).length > 0 || filter ? where : undefined,
          orderBy: { id: 'asc' },
        }),
        typeof prismaWithIng?.ingredient?.findMany === 'function'
          ? Promise.resolve(prismaWithIng.ingredient.findMany()).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!products || products.length === 0) {
        return [];
      }

      // Lấy tồn kho nguyên liệu cốt để tính toán số ly thực tế theo công thức
      let coffeeStock = ProductsService.getInMemoryIngredientStock('COFFEE_BEANS');
      let teaStock = ProductsService.getInMemoryIngredientStock('TEA_LEAVES');
      let milkStock = ProductsService.getInMemoryIngredientStock('MILK');
      let isDbIngredientsAvailable = false;

      if (Array.isArray(ingList) && ingList.length > 0) {
        isDbIngredientsAvailable = true;
        const ingMap = new Map(ingList.map((i) => [i.code, i.stock]));
        if (ingMap.has('COFFEE_BEANS')) coffeeStock = ingMap.get('COFFEE_BEANS')!;
        if (ingMap.has('TEA_LEAVES')) teaStock = ingMap.get('TEA_LEAVES')!;
        if (ingMap.has('MILK')) milkStock = ingMap.get('MILK')!;
      }

      const pendingUpdates: Array<Promise<unknown>> = [];

      for (const p of products) {
        const computedCups = ProductsService.calculateProductStock(
          p.name,
          coffeeStock,
          teaStock,
          milkStock,
          'S',
        );
        const hasBaseIngredient = computedCups > 0;
        const newStock = isDbIngredientsAvailable ? computedCups : (p.stock ?? computedCups);
        const newIsAvailable = p.isAvailable && hasBaseIngredient;

        // Tự động đồng bộ ngược lại vào bảng products trong DB (chạy song song không chặn phản hồi NFR-01)
        if (
          typeof this.prisma.product?.update === 'function' &&
          isDbIngredientsAvailable &&
          (p.stock !== newStock || p.isAvailable !== newIsAvailable)
        ) {
          pendingUpdates.push(
            Promise.resolve(
              this.prisma.product.update({
                where: { id: p.id },
                data: { stock: newStock, isAvailable: newIsAvailable },
              }),
            ).catch(() => null),
          );
        }

        p.stock = newStock;
        p.isAvailable = newIsAvailable;
      }

      if (pendingUpdates.length > 0) {
        void Promise.all(pendingUpdates);
      }

      return products;
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy danh sách sản phẩm: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Lấy chi tiết một sản phẩm theo ID kèm số ly tính toán theo nguyên liệu
   */
  async findById(id: number) {
    if (!id || isNaN(id) || id <= 0) {
      throw new BadRequestException('ID sản phẩm không hợp lệ. ID phải là số nguyên dương.');
    }

    try {
      const prismaWithIng = this.prisma as unknown as {
        ingredient?: {
          findMany?: () => Promise<Array<{ code: string; stock: number }>>;
        };
      };

      const [product, ingList] = await Promise.all([
        this.prisma.product.findUnique({
          where: { id },
        }),
        typeof prismaWithIng?.ingredient?.findMany === 'function'
          ? Promise.resolve(prismaWithIng.ingredient.findMany()).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
      }

      let coffeeStock = ProductsService.getInMemoryIngredientStock('COFFEE_BEANS');
      let teaStock = ProductsService.getInMemoryIngredientStock('TEA_LEAVES');
      let milkStock = ProductsService.getInMemoryIngredientStock('MILK');
      let isDbIngredientsAvailable = false;

      if (Array.isArray(ingList) && ingList.length > 0) {
        isDbIngredientsAvailable = true;
        const ingMap = new Map(ingList.map((i) => [i.code, i.stock]));
        if (ingMap.has('COFFEE_BEANS')) coffeeStock = ingMap.get('COFFEE_BEANS')!;
        if (ingMap.has('TEA_LEAVES')) teaStock = ingMap.get('TEA_LEAVES')!;
        if (ingMap.has('MILK')) milkStock = ingMap.get('MILK')!;
      }

      const computedCups = ProductsService.calculateProductStock(
        product.name,
        coffeeStock,
        teaStock,
        milkStock,
        'S',
      );

      const newStock = isDbIngredientsAvailable ? computedCups : (product.stock ?? computedCups);
      const newIsAvailable = product.isAvailable && computedCups > 0;

      // Tự động đồng bộ ngược lại vào bảng products trong DB (không chặn phản hồi NFR-01)
      if (
        typeof this.prisma.product?.update === 'function' &&
        isDbIngredientsAvailable &&
        (product.stock !== newStock || product.isAvailable !== newIsAvailable)
      ) {
        void Promise.resolve(
          this.prisma.product.update({
            where: { id: product.id },
            data: { stock: newStock, isAvailable: newIsAvailable },
          }),
        ).catch(() => null);
      }

      return {
        ...product,
        stock: newStock,
        isAvailable: newIsAvailable,
      };
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
   * Lấy danh sách Topping đi kèm cho thực đơn (bao gồm cả món tạm hết hàng)
   */
  async getToppings() {
    try {
      return await this.prisma.topping.findMany({
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
