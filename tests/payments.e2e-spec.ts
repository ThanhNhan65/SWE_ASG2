/**
 * Integration & E2E Test: Payments API
 * ======================================
 * Vị trí: tests/ (ngoài root - theo cấu trúc repository section 9)
 * Mục đích: Kiểm tra API thanh toán từ góc độ HTTP client bên ngoài:
 *   - Validation các trường bắt buộc (idempotencyKey, method, orderId)
 *   - Chặn các phương thức thanh toán không hợp lệ
 *
 * Thuật ngữ quan trọng:
 *   - Idempotency Key: Một chuỗi định danh duy nhất cho mỗi lần thanh toán.
 *     Nếu khách gửi 2 lần thanh toán cùng key → server chỉ xử lý 1 lần,
 *     tránh trừ tiền 2 lần dù bấm nhầm.
 *   - Integration Test: Kiểm tra nhiều thành phần phối hợp cùng nhau
 *     (Controller + DTO Validation + Service + Database)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../apps/api/src/app.module.js';

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
    await app.listen(0);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Integration Test: API Thanh Toán (POST /payments)', () => {
    /**
     * Kịch bản 1: Thiếu idempotencyKey
     * → Backend phải từ chối ngay ở tầng DTO Validation (không cần truy vấn DB)
     * → Trả về 400 Bad Request
     */
    it('400 Bad Request khi thiếu idempotencyKey', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .send({
          orderId: 1,
          method: 'WALLET',
          // Không có idempotencyKey → DTO reject
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    /**
     * Kịch bản 2: Phương thức thanh toán không tồn tại trong enum
     * → Enum PaymentMethod chỉ chấp nhận: WALLET | CARD
     * → 'BITCOIN_INVALID' không hợp lệ → 400 Bad Request
     */
    it('400 Bad Request khi method không hợp lệ (không phải WALLET hoặc CARD)', async () => {
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

    /**
     * Kịch bản 3: orderId = 0 (không hợp lệ)
     * → DTO khai báo @Min(1) cho orderId
     * → orderId = 0 vi phạm ràng buộc → 400 Bad Request
     */
    it('400 Bad Request khi orderId <= 0', async () => {
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
