import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsController } from '../src/products/products.controller.js';
import { ProductsService } from '../src/products/products.service.js';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';

describe('ProductsController - Unit Tests (Task 4.3)', () => {
  let controller: ProductsController;
  let mockProductsService: Partial<Record<keyof ProductsService, any>>;

  const mockProductList = [
    {
      id: 1,
      name: 'Cà phê sữa đá',
      price: 35000,
      stock: 50,
      isAvailable: true,
    },
    {
      id: 2,
      name: 'Americano',
      price: 40000,
      stock: 30,
      isAvailable: true,
    },
  ];

  beforeEach(() => {
    mockProductsService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      getToppings: vi.fn(),
    };

    controller = new ProductsController(mockProductsService as ProductsService);
  });

  describe('1. GET /products - Lấy danh sách sản phẩm', () => {
    it('gọi service.findAll và trả về danh sách sản phẩm thành công', async () => {
      mockProductsService.findAll.mockResolvedValue(mockProductList);

      const result = await controller.getAllProducts();

      expect(mockProductsService.findAll).toHaveBeenCalledWith({
        isAvailable: undefined,
        search: undefined,
      });
      expect(result).toEqual(mockProductList);
      expect(result).toHaveLength(2);
    });

    it('truyền đúng bộ lọc query available=true và search keyword', async () => {
      mockProductsService.findAll.mockResolvedValue([mockProductList[0]]);

      const result = await controller.getAllProducts('true', 'sữa');

      expect(mockProductsService.findAll).toHaveBeenCalledWith({
        isAvailable: true,
        search: 'sữa',
      });
      expect(result).toHaveLength(1);
    });

    it('trả về mảng rỗng [] khi danh sách thực đơn rỗng', async () => {
      mockProductsService.findAll.mockResolvedValue([]);

      const result = await controller.getAllProducts();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('ném lỗi khi service gặp sự cố', async () => {
      mockProductsService.findAll.mockRejectedValue(
        new InternalServerErrorException('Lỗi máy chủ nội bộ'),
      );

      await expect(controller.getAllProducts()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('2. GET /products/:id - Xem chi tiết sản phẩm', () => {
    it('gọi service.findById và trả về thông tin chi tiết của món', async () => {
      mockProductsService.findById.mockResolvedValue(mockProductList[0]);

      const result = await controller.getProductById(1);

      expect(mockProductsService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProductList[0]);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Cà phê sữa đá');
    });

    it('ném NotFoundException (404) khi sản phẩm không tồn tại', async () => {
      mockProductsService.findById.mockRejectedValue(
        new NotFoundException('Không tìm thấy sản phẩm với ID: 999'),
      );

      await expect(controller.getProductById(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ném BadRequestException (400) khi ID không hợp lệ', async () => {
      mockProductsService.findById.mockRejectedValue(
        new BadRequestException('ID sản phẩm không hợp lệ.'),
      );

      await expect(controller.getProductById(-1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('3. GET /products/toppings - Lấy danh sách topping', () => {
    it('trả về danh sách topping thành công', async () => {
      const toppings = [{ id: 1, name: 'Trân châu đen', price: 10000 }];
      mockProductsService.getToppings.mockResolvedValue(toppings);

      const result = await controller.getToppings();

      expect(mockProductsService.getToppings).toHaveBeenCalled();
      expect(result).toEqual(toppings);
    });

    it('trả về mảng rỗng [] khi không có topping nào khả dụng', async () => {
      mockProductsService.getToppings.mockResolvedValue([]);

      const result = await controller.getToppings();

      expect(result).toEqual([]);
    });
  });
});
