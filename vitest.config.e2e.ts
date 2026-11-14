/**
 * vitest.config.e2e.ts (đặt ở thư mục gốc dự án)
 * =================================================
 * File cấu hình riêng cho bộ test E2E nằm ở thư mục tests/ ngoài root.
 *
 * Cách dùng:
 *   vitest run --config vitest.config.e2e.ts
 *
 * Lý do cần file config riêng:
 *   - Unit test trong apps/api/ có config riêng (apps/api/vitest.config.ts)
 *   - E2E test trong tests/ cần resolve đường dẫn tsconfig từ apps/api
 *     vì import AppModule từ apps/api/src/
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Trỏ node_modules của apps/api để test trong tests/ tìm thấy @nestjs/testing, supertest
      '@nestjs/testing': resolve('./apps/api/node_modules/@nestjs/testing'),
      '@nestjs/common': resolve('./apps/api/node_modules/@nestjs/common'),
      '@nestjs/core': resolve('./apps/api/node_modules/@nestjs/core'),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['tests/**/*.e2e-spec.ts'],
    // Giải quyết module resolution từ thư mục apps/api
    deps: {
      moduleDirectories: ['node_modules', 'apps/api/node_modules'],
    },
  },
});
