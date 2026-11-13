import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

if (typeof process.loadEnvFile === 'function') {
  for (const envPath of [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ]) {
    if (existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
      } catch {
        // Bỏ qua nếu chạy qua biến môi trường hệ thống / Docker
      }
    }
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Backend running at http://localhost:${port}`);
}

void bootstrap();
