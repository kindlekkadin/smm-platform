import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PublicUser, toPublicUser } from './public-user';
import { SESSION_TTL_SECONDS } from './auth.constants';
import { UserRole, UserStatus } from '@prisma/client';

// Exported so the create-admin CLI hashes with the exact same cost factor
// instead of maintaining a second constant that could drift out of sync.
export const PASSWORD_SALT_ROUNDS = 10;

export interface AuthTokenResult {
  user: PublicUser;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        role: dto.role ?? UserRole.CUSTOMER,
      },
    });

    return toPublicUser(user);
  }

  async login(dto: LoginDto): Promise<AuthTokenResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is not active');
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
      },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      jti: session.id,
      role: user.role,
    });

    return { user: toPublicUser(user), token };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }
}
