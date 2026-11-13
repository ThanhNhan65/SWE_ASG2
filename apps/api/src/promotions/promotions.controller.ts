import { Controller, Get, Param } from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get(':code')
  async getByCode(@Param('code') code: string) {
    return this.promotionsService.findByCode(code);
  }
}
