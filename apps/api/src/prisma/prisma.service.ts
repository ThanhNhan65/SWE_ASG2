import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  constructor() {
    const dbUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:17092006@localhost:5432/brewlite_db?schema=public';

    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = dbUrl;
    }
    if (!process.env.DATABASE_URL_UNPOOLED) {
      process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
    }

    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }

  async ensureConnected(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Đã kết nối lại thành công tới cơ sở dữ liệu PostgreSQL.');
      return true;
    } catch (error: unknown) {
      this.isConnected = false;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Kết nối PostgreSQL thất bại: ${message}`);
      return false;
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Đã kết nối thành công tới cơ sở dữ liệu PostgreSQL.');
    } catch (error: unknown) {
      this.isConnected = false;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Chưa thể kết nối CSDL PostgreSQL (${message}). Chuyển sang chế độ chạy an toàn với In-Memory Mock.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
