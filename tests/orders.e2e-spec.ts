/**
 * Integration & E2E Test: Orders & Menu Flow
 * ============================================
 * Vị trí: tests/ (ngoài root - theo cấu trúc repository section 9)
 * Mục đích: Kiểm tra toàn bộ luồng HTTP từ ngoài vào trong:
 *   - GET /health     → Hệ thống có hoạt động không?
 *   - GET /products   → Lấy menu thực đơn
 *   - POST /orders    → Tạo đơn hàng (kiểm tra validation)
 *
 * Công cụ:
 *   - supertest: Giả lập gửi HTTP request đến NestJS app (không cần mở browser)
 *   - @nestjs/testing: Khởi động toàn bộ ứng dụng NestJS trong môi trường test
 *   - vitest: Test runner thực thi và báo cáo kết quả
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../apps/api/src/app.module.js';

describe('Orders & Menu Flow (Integration & E2E Test)', () => {
  let app: INestApplication;

  /**
   * beforeAll: Chạy 1 lần DUY NHẤT trước tất cả các test trong file này.
   * → Khởi động NestJS app giống hệt khi chạy server thật,
   *   bao gồm toàn bộ module: Products, Orders, Payments, Auth, Prisma...
   */
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // ValidationPipe: Bật kiểm tra DTO - tự động reject request thiếu/sai dữ liệu
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,          // Loại bỏ các trường thừa không khai báo trong DTO
        transform: true,          // Tự động chuyển kiểu dữ liệu (string → number)
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  /**
   * afterAll: Chạy 1 lần DUY NHẤT SAU khi tất cả test kết thúc.
   * → Tắt app để giải phóng cổng (port) và kết nối database.
   */
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // NHÓM TEST 1: Health Check
  // Mục đích: Chứng minh hệ thống đang sống và hoạt động
  // ─────────────────────────────────────────────────────────────
  describe('1. Health Check Endpoint', () => {
    it('GET /health - hệ thống trả về status ok', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200); // expect(200) = mong đợi HTTP status code 200

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'brewlite-api');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // NHÓM TEST 2: Menu sản phẩm
  // Mục đích: Kiểm tra API GET lấy dữ liệu từ database trả về đúng
  // ─────────────────────────────────────────────────────────────
  describe('2. Luồng Menu Sản phẩm (GET /products)', () => {
    it('GET /products - lấy danh sách thực đơn trả về mảng', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /products/toppings - lấy danh sách topping trả về mảng', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/toppings')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /products/ingredients - lấy danh sách nguyên vật liệu trả về mảng', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/ingredients')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // NHÓM TEST 3: Validation khi tạo đơn hàng
  // Mục đích: Kiểm tra Backend từ chối đúng các dữ liệu không hợp lệ
  // (Đây là Integration Test vì có cả DTO validation + Service logic)
  // ─────────────────────────────────────────────────────────────
  describe('3. Integration Test: API Tạo Đơn Hàng (POST /orders)', () => {
    it('400 Bad Request khi giỏ hàng rỗng (items: [])', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({ userId: 1, items: [] }) // .send() = gắn Body vào request
        .expect(400);

      expect(res.body.message).toBeDefined(); // Phải có thông báo lỗi
    });

    it('400 Bad Request khi quantity <= 0', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userId: 1,
          items: [{ productId: 1, quantity: 0 }],
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('400 Bad Request khi productId là số âm (không hợp lệ)', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          userId: 1,
          items: [{ productId: -5, quantity: 1 }],
        })
        .expect(400);
    });
  });
});
