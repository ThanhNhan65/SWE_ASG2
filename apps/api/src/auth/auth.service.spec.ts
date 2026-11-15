import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: {
    isConnected: boolean;
    ensureConnected: ReturnType<typeof vi.fn>;
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let mockJwtService: {
    signAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      isConnected: true,
      ensureConnected: vi.fn().mockResolvedValue(true),
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };
    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('signed-jwt-token'),
    };
    authService = new AuthService(mockPrisma as never, mockJwtService as never);
  });

  it('registers and logs in via database without falling back to RAM', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 7,
        email: 'user@brewlite.vn',
        fullName: 'Test User',
        passwordHash,
        loyaltyPoints: 0,
        createdAt: new Date(),
      });
    mockPrisma.user.create.mockResolvedValue({
      id: 7,
      email: 'user@brewlite.vn',
      fullName: 'Test User',
      loyaltyPoints: 0,
      createdAt: new Date(),
    });

    const reg = await authService.register({
      email: 'USER@brewlite.vn',
      password: 'secret123',
      fullName: 'Test User',
    });
    expect(reg.success).toBe(true);
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);

    const loginRes = await authService.login({
      email: 'user@brewlite.vn',
      password: 'secret123',
    });
    expect(loginRes.accessToken).toBe('signed-jwt-token');
    expect(loginRes.user.id).toBe(7);
  });

  it('throws InternalServerErrorException on DB error during register instead of saving to RAM', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockRejectedValue(new Error('Connection terminated'));

    await expect(
      authService.register({
        email: 'lost@brewlite.vn',
        password: 'secret123',
      }),
    ).rejects.toThrow(InternalServerErrorException);

    // Subsequent login must query DB (not succeed from RAM)
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      authService.login({
        email: 'lost@brewlite.vn',
        password: 'secret123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws ServiceUnavailableException instead of wrong credentials when DB login query fails', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB timeout'));

    await expect(
      authService.login({
        email: 'user@brewlite.vn',
        password: 'secret123',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('uses mock user ID >= 100000 when DB is disconnected so it does not collide with seeded userId=1', async () => {
    const prevDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const offlinePrisma = {
        isConnected: false,
        ensureConnected: vi.fn().mockResolvedValue(false),
      };
      const offlineAuth = new AuthService(offlinePrisma as never, mockJwtService as never);
      const reg = await offlineAuth.register({
        email: 'newuser@brewlite.vn',
        password: 'secret123',
        fullName: 'New User',
      });
      expect(reg.user.id).toBeGreaterThanOrEqual(100000);
    } finally {
      if (prevDbUrl !== undefined) {
        process.env.DATABASE_URL = prevDbUrl;
      }
    }
  });

  it('JwtStrategy rejects token when payload email does not match database user email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'customer@brewlite.vn',
      fullName: 'Seeded User',
      loyaltyPoints: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const jwtStrategy = new JwtStrategy(authService);

    await expect(
      jwtStrategy.validate({ sub: 1, email: 'another@brewlite.vn' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      jwtStrategy.validate({ sub: 1, email: 'customer@brewlite.vn' }),
    ).resolves.toMatchObject({ id: 1, email: 'customer@brewlite.vn' });
  });
});
