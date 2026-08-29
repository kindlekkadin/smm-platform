import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialPlatform, SocialAccountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TokenCipherService } from '../common/crypto/token-cipher.service';
import { SocialPlatformRegistry } from './platforms/social-platform-registry';
import type { CompleteConnectionInput } from './platforms/social-platform-provider.interface';
import { CompleteConnectionDto } from './dto/complete-connection.dto';
import { PublicSocialAccount, toPublicSocialAccount } from './public-social-account';

export function parsePlatform(value: string): SocialPlatform {
  if ((Object.values(SocialPlatform) as string[]).includes(value)) {
    return value as SocialPlatform;
  }
  throw new BadRequestException(`Unknown platform: ${value}`);
}

@Injectable()
export class SocialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SocialPlatformRegistry,
    private readonly tokenCipher: TokenCipherService,
  ) {}

  async list(userId: string): Promise<PublicSocialAccount[]> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
    });
    return accounts.map(toPublicSocialAccount);
  }

  async get(userId: string, accountId: string): Promise<PublicSocialAccount> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException('Social account not found');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this social account');
    }
    return toPublicSocialAccount(account);
  }

  async initiateConnect(userId: string, platformParam: string) {
    const platform = parsePlatform(platformParam);
    const provider = this.registry.get(platform);
    return provider.initiateConnection(userId);
  }

  async completeConnect(
    userId: string,
    platformParam: string,
    dto: CompleteConnectionDto,
  ): Promise<PublicSocialAccount> {
    const platform = parsePlatform(platformParam);
    const provider = this.registry.get(platform);

    // DTOs are validated request bodies without an index signature; the
    // provider interface only cares about structural compatibility here.
    const connected = await provider.completeConnection(
      userId,
      dto as unknown as CompleteConnectionInput,
    );
    const encryptedToken = this.tokenCipher.encrypt(connected.accessToken);

    const existing = await this.prisma.socialAccount.findUnique({
      where: {
        userId_platform_platformAccountId: {
          userId,
          platform,
          platformAccountId: connected.platformAccountId,
        },
      },
    });

    if (existing) {
      if (existing.status === SocialAccountStatus.ACTIVE) {
        throw new ConflictException('This account is already connected');
      }

      const reconnected = await this.prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          username: connected.username,
          displayName: connected.displayName,
          profileImageUrl: connected.profileImageUrl,
          accessTokenSecret: encryptedToken,
          status: SocialAccountStatus.ACTIVE,
          connectedAt: new Date(),
          disconnectedAt: null,
        },
      });
      return toPublicSocialAccount(reconnected);
    }

    const created = await this.prisma.socialAccount.create({
      data: {
        userId,
        platform,
        platformAccountId: connected.platformAccountId,
        username: connected.username,
        displayName: connected.displayName,
        profileImageUrl: connected.profileImageUrl,
        accessTokenSecret: encryptedToken,
      },
    });
    return toPublicSocialAccount(created);
  }

  async disconnect(userId: string, accountId: string): Promise<PublicSocialAccount> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException('Social account not found');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this social account');
    }

    const disconnected = await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        status: SocialAccountStatus.DISCONNECTED,
        disconnectedAt: new Date(),
        accessTokenSecret: null,
      },
    });
    return toPublicSocialAccount(disconnected);
  }
}
