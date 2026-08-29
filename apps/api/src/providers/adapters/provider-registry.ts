import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { ProviderAdapter } from './provider-adapter.interface';

export const PROVIDER_ADAPTERS = 'PROVIDER_ADAPTERS';

/**
 * Looks up the ProviderAdapter for a given Provider.code. Adding a real
 * fulfillment provider means adding a new adapter class and listing it in
 * ProvidersModule's PROVIDER_ADAPTERS factory — nothing else in the app
 * needs to change.
 */
@Injectable()
export class ProviderRegistry {
  private readonly adapters: Map<string, ProviderAdapter>;

  constructor(@Inject(PROVIDER_ADAPTERS) adapters: ProviderAdapter[]) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.code, adapter]));
  }

  get(code: string): ProviderAdapter {
    const adapter = this.adapters.get(code);
    if (!adapter) {
      throw new NotImplementedException(
        `The ${code} provider adapter is not yet configured in this environment`,
      );
    }
    return adapter;
  }
}
