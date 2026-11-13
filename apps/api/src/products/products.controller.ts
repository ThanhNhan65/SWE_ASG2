import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /products
   * Lấy danh sách sản phẩm thực đơn (hỗ trợ filter available & search)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllProducts(
    @Query('available') available?: string,
    @Query('search') search?: string,
  ) {
    const isAvailable =
      available === 'true' ? true : available === 'false' ? false : undefined;

    return this.productsService.findAll({
      isAvailable,
      search,
    });
  }

  /**
   * GET /products/toppings
   * Lấy danh sách topping khả dụng
   */
  @Get('toppings')
  @HttpCode(HttpStatus.OK)
  async getToppings() {
    return this.productsService.getToppings();
  }

  /**
   * GET /products/ingredients
   * Lấy danh sách định lượng nguyên liệu trong kho (giống BrewLite 1 & branch Vinh)
   */
  @Get('ingredients')
  @HttpCode(HttpStatus.OK)
  async findAllIngredients() {
    return this.productsService.findAllIngredients();
  }

  /**
   * GET /products/:id
   * Xem thông tin chi tiết một sản phẩm
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getProductById(
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory: () =>
          new BadRequestException('ID sản phẩm phải là một số nguyên hợp lệ.'),
      }),
    )
    id: number,
  ) {
    return this.productsService.findById(id);
  }
}
