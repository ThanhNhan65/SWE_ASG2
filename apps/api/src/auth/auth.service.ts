import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

interface AuthUserRecord {
  id: number;
  email: string;
  fullName: string | null;
  passwordHash: string;
  loyaltyPoints: number;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly inMemoryUsersByEmail = new Map<string, AuthUserRecord>();
  private readonly inMemoryUsersById = new Map<number, AuthUserRecord>();
  private nextUserId = 100000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async ensureDbConnection(): Promise<boolean> {
    if (this.prisma?.isConnected) {
      return true;
    }
    if (typeof this.prisma?.ensureConnected === 'function') {
      return this.prisma.ensureConnected();
    }
    return false;
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const dbReady = await this.ensureDbConnection();

    if (process.env.DATABASE_URL && !dbReady) {
      throw new ServiceUnavailableException(
        'Hệ thống cơ sở dữ liệu đang khởi động, vui lòng thử lại sau vài giây.',
      );
    }

    if (dbReady) {
      try {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          throw new ConflictException('Email này đã được đăng ký. Vui lòng sử dụng email khác.');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: passwordHash,
            fullName: dto.fullName?.trim() || null,
            loyaltyPoints: 0,
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            loyaltyPoints: true,
            createdAt: true,
          },
        });

        return {
          success: true,
          message: 'Đăng ký tài khoản thành công',
          user,
        };
      } catch (error: unknown) {
        if (error instanceof ConflictException) throw error;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Lỗi đăng ký tài khoản vào DB: ${message}`);
        throw new InternalServerErrorException(
          'Không thể lưu tài khoản vào cơ sở dữ liệu. Vui lòng thử lại.',
        );
      }
    }

    if (this.inMemoryUsersByEmail.has(normalizedEmail)) {
      throw new ConflictException('Email này đã được đăng ký. Vui lòng sử dụng email khác.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);
    const userId = this.nextUserId++;

    const user: AuthUserRecord = {
      id: userId,
      email: normalizedEmail,
      fullName: dto.fullName?.trim() || null,
      passwordHash,
      loyaltyPoints: 0,
      createdAt: new Date(),
    };

    this.inMemoryUsersByEmail.set(normalizedEmail, user);
    this.inMemoryUsersById.set(userId, user);

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        loyaltyPoints: user.loyaltyPoints,
        createdAt: user.createdAt,
      },
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const invalidCredentialsMsg = 'Email hoặc mật khẩu không chính xác';
    const dbReady = await this.ensureDbConnection();

    if (process.env.DATABASE_URL && !dbReady) {
      throw new ServiceUnavailableException(
        'Hệ thống cơ sở dữ liệu đang khởi động, vui lòng thử lại sau vài giây.',
      );
    }

    let user: AuthUserRecord | null = null;

    if (dbReady) {
      try {
        user = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Lỗi truy vấn đăng nhập DB: ${message}`);
        throw new ServiceUnavailableException(
          'Không thể kết nối cơ sở dữ liệu để đăng nhập. Vui lòng thử lại.',
        );
      }
    } else {
      user = this.inMemoryUsersByEmail.get(normalizedEmail) ?? null;
    }

    if (!user) {
      throw new UnauthorizedException(invalidCredentialsMsg);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(invalidCredentialsMsg);
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      success: true,
      message: 'Đăng nhập thành công',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        loyaltyPoints: user.loyaltyPoints ?? 0,
      },
    };
  }

  async getProfile(userId: number | string) {
    const numericId = Number(userId);
    const dbReady = await this.ensureDbConnection();

    if (process.env.DATABASE_URL && !dbReady) {
      throw new ServiceUnavailableException(
        'Hệ thống cơ sở dữ liệu đang khởi động, vui lòng thử lại sau vài giây.',
      );
    }

    if (dbReady) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: numericId },
          select: {
            id: true,
            email: true,
            fullName: true,
            loyaltyPoints: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (!user) {
          throw new UnauthorizedException('Người dùng không tồn tại');
        }
        return user;
      } catch (error: unknown) {
        if (error instanceof UnauthorizedException) throw error;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Lỗi lấy thông tin người dùng DB: ${message}`);
        throw new ServiceUnavailableException(
          'Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại.',
        );
      }
    }

    const memUser = this.inMemoryUsersById.get(numericId);
    if (!memUser) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    return {
      id: memUser.id,
      email: memUser.email,
      fullName: memUser.fullName,
      loyaltyPoints: memUser.loyaltyPoints ?? 0,
      createdAt: memUser.createdAt,
      updatedAt: memUser.createdAt,
    };
  }
}
