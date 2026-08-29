import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { SocialPlatformProvider } from './social-platform-provider.interface';

export const SOCIAL_PLATFORM_PROVIDERS = 'SOCIAL_PLATFORM_PROVIDERS';

/**
 * Looks up the SocialPlatformProvider for a given platform. Adding a new
 * platform means adding a new provider class and listing it in
 * SocialAccountsModule's SOCIAL_PLATFORM_PROVIDERS factory — nothing else in
 * the app needs to change.
 */
@Injectable()
export class SocialPlatformRegistry {
  private readonly providers: Map<SocialPlatform, SocialPlatformProvider>;

  constructor(@Inject(SOCIAL_PLATFORM_PROVIDERS) providers: SocialPlatformProvider[]) {
    this.providers = new Map(providers.map((provider) => [provider.platform, provider]));
  }

  get(platform: SocialPlatform): SocialPlatformProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new NotImplementedException(
        `The ${platform} integration is not yet configured in this environment`,
      );
    }
    return provider;
  }

  isSupported(platform: SocialPlatform): boolean {
    return this.providers.has(platform);
  }
}
