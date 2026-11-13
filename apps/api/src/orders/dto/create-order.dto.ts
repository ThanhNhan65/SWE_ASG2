import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductSize {
  S = 'S',
  M = 'M',
  L = 'L',
}

export class OrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @Min(1, { message: 'productId không hợp lệ' })
  productId: number;

  @IsOptional()
  @IsEnum(ProductSize, { message: 'Size phải là S, M hoặc L' })
  size?: ProductSize = ProductSize.M;

  @IsOptional()
  @IsString()
  sweetness?: string = '100%';

  @IsOptional()
  @IsString()
  ice?: string = 'Bình thường';

  @IsOptional()
  @IsArray()
  toppings?: any[] = [];

  @IsInt({ message: 'Số lượng (quantity) phải là số nguyên' })
  @Min(1, { message: 'Số lượng món phải lớn hơn hoặc bằng 1' })
  quantity: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsInt({ message: 'userId phải là số nguyên' })
  userId?: number;

  @IsArray({ message: 'Danh sách sản phẩm phải là mảng' })
  @ArrayMinSize(1, { message: 'Giỏ hàng không được để trống khi đặt hàng' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsInt({ message: 'Số điểm sử dụng phải là số nguyên' })
  @Min(0, { message: 'Số điểm sử dụng không được âm' })
  pointsToUse?: number;
}
