import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Orders & Menu Flow (Integration & E2E Test)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /health - kiểm tra hệ thống hoạt động', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'brewlite-api');
    });
  });

  describe('2. Luồng Menu Sản phẩm (GET /products)', () => {
    it('GET /products - lấy danh sách thực đơn', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /products/toppings - lấy danh sách topping', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/toppings')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /products/ingredients - lấy danh sách nguyên vật liệu', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/ingredients')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('3. Integration Test: API Tạo Đơn Hàng (POST /orders)', () => {
    it('Thất bại khi giỏ hàng trống (items rỗng) - mong đợi 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userId: 1,
          items: [],
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('Thất bại khi số lượng (quantity) <= 0 - mong đợi 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userId: 1,
          items: [
            {
              productId: 1,
              quantity: 0,
            },
          ],
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('Thất bại khi productId không hợp lệ / không phải số nguyên dương', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          userId: 1,
          items: [
            {
              productId: -5,
              quantity: 1,
            },
          ],
        })
        .expect(400);
    });
  });
});
