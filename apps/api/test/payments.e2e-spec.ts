import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Payments API (Integration & E2E Test)', () => {
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

  describe('Integration Test: API Thanh Toán (POST /payments)', () => {
    it('Thất bại khi thiếu idempotencyKey - mong đợi 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId: 1,
          method: 'WALLET',
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('Thất bại khi phương thức thanh toán không hợp lệ - mong đợi 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId: 1,
          method: 'BITCOIN_INVALID',
          idempotencyKey: 'test-key-1',
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('Thất bại khi orderId <= 0 - mong đợi 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId: 0,
          method: 'WALLET',
          idempotencyKey: 'test-key-2',
        })
        .expect(400);
    });
  });
});
