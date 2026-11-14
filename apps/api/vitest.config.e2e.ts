import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@nestjs/testing': resolve(rootDir, 'node_modules/@nestjs/testing'),
      '@nestjs/common': resolve(rootDir, 'node_modules/@nestjs/common'),
      '@nestjs/core': resolve(rootDir, 'node_modules/@nestjs/core'),
      '@nestjs/platform-express': resolve(rootDir, 'node_modules/@nestjs/platform-express'),
      supertest: resolve(rootDir, 'node_modules/supertest'),
      vitest: resolve(rootDir, 'node_modules/vitest'),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['../../tests/**/*.e2e-spec.ts'],
  },
});
