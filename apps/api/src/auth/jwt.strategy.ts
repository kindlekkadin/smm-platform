import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';
import { AuthenticatedUser, toPublicUser } from './public-user';
import { UserStatus } from '@prisma/client';

interface JwtPayload {
  sub: string;
  jti: string;
  role: string;
}

function extractFromCookie(req: Request): string | null {
  return (req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await this.prisma.session.findUnique({ where: { id: payload.jti } });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    return { ...toPublicUser(user), sessionId: session.id };
  }
}
