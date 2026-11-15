import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service.js';

export interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'brewlite_jwt_secret_key_2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.getProfile(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc phiên đăng nhập đã hết hạn');
    }

    if (
      payload.email &&
      user.email &&
      user.email.toLowerCase() !== payload.email.toLowerCase()
    ) {
      throw new UnauthorizedException(
        'Phiên đăng nhập không khớp với tài khoản, vui lòng đăng nhập lại',
      );
    }

    return user;
  }
}
