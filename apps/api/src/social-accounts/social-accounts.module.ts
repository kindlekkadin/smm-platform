import { Module } from '@nestjs/common';
import { SocialAccountsController } from './social-accounts.controller';
import { SocialAccountsService } from './social-accounts.service';
import { TokenCipherService } from '../common/crypto/token-cipher.service';
import { SocialPlatformRegistry, SOCIAL_PLATFORM_PROVIDERS } from './platforms/social-platform-registry';
import { DevMockProvider } from './platforms/dev-mock.provider';
import { SocialPlatformProvider } from './platforms/social-platform-provider.interface';

@Module({
  controllers: [SocialAccountsController],
  providers: [
    SocialAccountsService,
    TokenCipherService,
    SocialPlatformRegistry,
    DevMockProvider,
    {
      provide: SOCIAL_PLATFORM_PROVIDERS,
      useFactory: (devMock: DevMockProvider): SocialPlatformProvider[] => [
        devMock,
        // Real platforms (INSTAGRAM, TIKTOK, YOUTUBE, FACEBOOK, X) are added
        // here once their OAuth app credentials exist — see PLATFORM_INTEGRATION.md.
      ],
      inject: [DevMockProvider],
    },
  ],
})
export class SocialAccountsModule {}
