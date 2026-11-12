import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ProductsService', () => {
  let service: ProductsService;

  const prismaMock = {
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

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('trả về danh sách tất cả sản phẩm khi không có query', async () => {
      const mockProducts = [
        { id: 1, name: 'Trà Sữa Trân Châu', price: 35000, isAvailable: true },
        { id: 2, name: 'Cà Phê Muối', price: 29000, isAvailable: true },
      ];
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(result).toEqual(mockProducts);
      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { id: 'asc' },
      });
    });

    it('lọc danh sách sản phẩm theo từ khóa tìm kiếm (search)', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'Trà Sữa' });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'Trà Sữa', mode: 'insensitive' },
        },
        orderBy: { id: 'asc' },
      });
    });

    it('lọc danh sách sản phẩm theo trạng thái khả dụng (isAvailable)', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      await service.findAll({ isAvailable: true });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: {
          isAvailable: true,
        },
        orderBy: { id: 'asc' },
      });
    });

    it('kết hợp lọc cả search và isAvailable', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'Cà phê', isAvailable: false });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'Cà phê', mode: 'insensitive' },
          isAvailable: false,
        },
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('trả về sản phẩm tương ứng với ID', async () => {
      const mockProduct = {
        id: 1,
        name: 'Trà Sữa Oolong',
        price: 32000,
        isAvailable: true,
      };
      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(result).toEqual(mockProduct);
      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('ném NotFoundException khi không tìm thấy sản phẩm', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('findAllToppings', () => {
    it('trả về danh sách topping', async () => {
      const mockToppings = [{ id: 1, name: 'Trân Châu Đen', price: 5000 }];
      prismaMock.topping.findMany.mockResolvedValue(mockToppings);

      const result = await service.findAllToppings();

      expect(result).toEqual(mockToppings);
      expect(prismaMock.topping.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('findAllIngredients', () => {
    it('trả về danh sách nguyên liệu', async () => {
      const mockIngredients = [{ id: 1, code: 'SUGAR', name: 'Đường' }];
      prismaMock.ingredient.findMany.mockResolvedValue(mockIngredients);

      const result = await service.findAllIngredients();

      expect(result).toEqual(mockIngredients);
      expect(prismaMock.ingredient.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
      });
    });
  });
});
