import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsService } from '../src/products/products.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProductsService - Unit Tests (Task 4.3)', () => {
  let productsService: ProductsService;
  let mockPrisma: any;

  const mockProducts = [
    {
      id: 1,
      name: 'Cà phê sữa đá',
      description: 'Cà phê Robusta đậm đà kết hợp sữa đặc ngọt béo.',
      price: 35000,
      imageUrl: 'https://example.com/cf-sua.jpg',
      stock: 50,
      isAvailable: true,
      version: 1,
      createdAt: new Date(),
    },
    {
      id: 2,
      name: 'Americano',
      description: 'Espresso nguyên chất pha loãng với nước đá.',
      price: 40000,
      imageUrl: 'https://example.com/americano.jpg',
      stock: 30,
      isAvailable: true,
      version: 1,
      createdAt: new Date(),
    },
    {
      id: 3,
      name: 'Trà sen vàng (Tạm hết)',
      description: 'Trà sen thanh mát kèm củ sen giòn ngọt.',
      price: 45000,
      imageUrl: 'https://example.com/tra-sen.jpg',
      stock: 0,
      isAvailable: false,
      version: 1,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      topping: {
        findMany: vi.fn(),
      },
      ingredient: {
        findMany: vi.fn(),
      },
    };

    productsService = new ProductsService(mockPrisma);
  });

  describe('1. Lấy danh sách sản phẩm thực đơn (GET /products)', () => {
    it('trả về danh sách toàn bộ món khi CSDL có dữ liệu', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await productsService.findAll();

      expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Cà phê sữa đá');
      expect(result[1].name).toBe('Americano');
    });

    it('lọc danh sách theo trạng thái khả dụng (isAvailable = true)', async () => {
      const availableOnly = mockProducts.filter((p) => p.isAvailable);
      mockPrisma.product.findMany.mockResolvedValue(availableOnly);

      const result = await productsService.findAll({ isAvailable: true });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true },
        orderBy: { id: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.isAvailable)).toBe(true);
    });

    it('tìm kiếm sản phẩm theo từ khóa tên (search)', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProducts[0]]);

      const result = await productsService.findAll({ search: 'sữa đá' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'sữa đá',
            mode: 'insensitive',
          },
        },
        orderBy: { id: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('sữa đá');
    });
  });

  describe('2. Kiểm tra dữ liệu rỗng (Empty State)', () => {
    it('trả về mảng rỗng [] khi CSDL chưa có sản phẩm nào', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await productsService.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('trả về mảng rỗng [] khi tìm kiếm không khớp bất kỳ sản phẩm nào', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await productsService.findAll({ search: 'món không tồn tại' });

      expect(result).toEqual([]);
    });

    it('trả về mảng rỗng [] khi không có topping nào khả dụng', async () => {
      mockPrisma.topping.findMany.mockResolvedValue([]);

      const result = await productsService.getToppings();

      expect(result).toEqual([]);
    });
  });

  describe('3. Xem chi tiết sản phẩm (GET /products/:id)', () => {
    it('trả về thông tin chi tiết đầy đủ khi ID hợp lệ và tồn tại', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProducts[0]);

      const result = await productsService.findById(1);

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe('Cà phê sữa đá');
      expect(result.price).toBe(35000);
      expect(result.stock).toBe(50);
    });

    it('findOne hoạt động tương đương findById', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProducts[0]);

      const result = await productsService.findOne(1);

      expect(result).toEqual(mockProducts[0]);
    });
  });

  describe('4. Xử lý lỗi API & Ngoại lệ (API Error Handling)', () => {
    it('ném lỗi BadRequestException khi ID không hợp lệ (ID <= 0)', async () => {
      await expect(productsService.findById(0)).rejects.toThrow(BadRequestException);
      await expect(productsService.findById(-5)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
    });

    it('ném lỗi BadRequestException khi ID là NaN hoặc undefined', async () => {
      await expect(productsService.findById(NaN as any)).rejects.toThrow(BadRequestException);
      await expect(productsService.findById(undefined as any)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
    });

    it('ném lỗi NotFoundException (404) khi không tìm thấy sản phẩm trong CSDL', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(productsService.findById(999)).rejects.toThrow(NotFoundException);
      await expect(productsService.findById(999)).rejects.toThrow(
        'Không tìm thấy sản phẩm với ID: 999',
      );
    });

    it('ném lỗi khi tầng CSDL gặp sự cố kết nối Prisma', async () => {
      mockPrisma.product.findMany.mockRejectedValue(
        new Error('Cannot reach database server at localhost:5432'),
      );

      await expect(productsService.findAll()).rejects.toThrow(
        'Cannot reach database server at localhost:5432',
      );
    });
  });

  describe('5. Lấy toàn bộ Topping & Nguyên liệu (findAllToppings & findAllIngredients)', () => {
    it('trả về danh sách toàn bộ topping', async () => {
      const mockToppings = [{ id: 1, name: 'Trân Châu Đen', price: 10000 }];
      mockPrisma.topping.findMany.mockResolvedValue(mockToppings);

      const result = await productsService.findAllToppings();

      expect(result).toEqual(mockToppings);
    });

    it('trả về danh sách nguyên liệu trong kho', async () => {
      const mockIngredients = [{ id: 1, code: 'SUGAR', name: 'Đường' }];
      mockPrisma.ingredient.findMany.mockResolvedValue(mockIngredients);

      const result = await productsService.findAllIngredients();

      expect(result).toEqual(mockIngredients);
    });
  });
});
