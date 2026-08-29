import { Module } from '@nestjs/common';
import { TokenCipherService } from '../common/crypto/token-cipher.service';
import { AdminProvidersController } from './admin/admin-providers.controller';
import { AdminProviderMappingsController } from './admin/admin-provider-mappings.controller';
import { AdminProviderOrdersController } from './admin/admin-provider-orders.controller';
import { ProviderWebhookController } from './provider-webhook.controller';
import { ProvidersService } from './providers.service';
import { ProviderOrdersService } from './provider-orders.service';
import { PROVIDER_ADAPTERS, ProviderRegistry } from './adapters/provider-registry';
import { DevMockProvider } from './adapters/dev-mock.provider';
import { ProviderAdapter } from './adapters/provider-adapter.interface';

@Module({
  controllers: [
    AdminProvidersController,
    AdminProviderMappingsController,
    AdminProviderOrdersController,
    ProviderWebhookController,
  ],
  providers: [
    ProvidersService,
    ProviderOrdersService,
    ProviderRegistry,
    TokenCipherService,
    DevMockProvider,
    {
      provide: PROVIDER_ADAPTERS,
      useFactory: (devMock: DevMockProvider): ProviderAdapter[] => [
        devMock,
        // A real automated fulfillment provider is added here once selected
        // and configured — see PROVIDER_INTEGRATION.md.
      ],
      inject: [DevMockProvider],
    },
  ],
})
export class ProvidersModule {}
