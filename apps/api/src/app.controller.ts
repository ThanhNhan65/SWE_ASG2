import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'brewlite-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  getRoot() {
    return {
      name: 'BrewLite API',
      version: '1.0.0',
    };
  }
}
