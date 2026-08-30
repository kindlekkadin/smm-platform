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

// The frontend and API are deployed on different sites (e.g. *.vercel.app
// vs *.onrender.com), so every request between them is cross-site from the
// cookie's perspective. SameSite=Lax is never attached to a cross-site
// fetch/XHR (only to top-level navigations), so in that environment login
// would appear to succeed but every subsequent request — including the
// post-login /api/auth/me refresh — silently loses the session, bouncing
// the user straight back to /login. SameSite=None fixes that, at the cost
// of removing this app's only CSRF protection (CORS does not prevent a
// plain cross-site <form> POST from carrying this cookie). Acceptable for
// now — this environment has no real payment/user data — but revisit
// before any real-production use: a custom domain that puts both apps on
// the same site, Bearer-token auth, or real CSRF tokens.
const IS_CROSS_SITE_DEPLOYMENT = process.env.NODE_ENV === 'production';
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (IS_CROSS_SITE_DEPLOYMENT ? 'none' : 'lax') as 'none' | 'lax',
  // A SameSite=None cookie is rejected outright by browsers unless also
  // Secure, and Secure cookies are refused over plain HTTP — exactly what
  // local dev (http://localhost) is — so this must track NODE_ENV rather
  // than being hardcoded either way.
  secure: IS_CROSS_SITE_DEPLOYMENT,
  path: '/',
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
      ...SESSION_COOKIE_OPTIONS,
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
    // clearCookie must be called with the same attributes the cookie was
    // set with, or some browsers won't recognize it as the same cookie to
    // remove and it lingers past logout.
    res.clearCookie(ACCESS_TOKEN_COOKIE, SESSION_COOKIE_OPTIONS);
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
