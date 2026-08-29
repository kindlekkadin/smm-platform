import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ACCESS_TOKEN_COOKIE, SESSION_TTL_SECONDS } from './auth.constants';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './public-user';

// Tighter than the app-wide default — these are the two endpoints a
// credential-stuffing/brute-force attempt would actually hit. Relaxed only
// under Jest (which sets NODE_ENV=test by default): e2e specs legitimately
// call login/register more than 5 times per suite while exercising
// unrelated business logic, and this is not the throttle's own test.
const AUTH_THROTTLE = {
  default: { limit: process.env.NODE_ENV === 'test' ? 1000 : 5, ttl: 60_000 },
};

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.login(dto);

    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      // Real browsers refuse a `secure` cookie over plain HTTP, which is
      // exactly what local dev (http://localhost) is — so this must track
      // NODE_ENV rather than being hardcoded either way.
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_SECONDS * 1000,
    });

    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sessionId);
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    const { sessionId: _sessionId, ...publicUser } = user;
    return { user: publicUser };
  }

  @Get('admin-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminCheck() {
    return { ok: true, message: 'Role authorization infrastructure is working' };
  }
}
