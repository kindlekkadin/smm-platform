import { SocialPlatform } from '@prisma/client';

export interface InitiateConnectionResult {
  /**
   * Where the frontend should send the user to authorize the connection.
   * For a real platform this is the platform's OAuth consent URL. For the
   * development mock provider this is an in-app route.
   */
  authorizationUrl: string;
  state: string;
}

export interface CompleteConnectionInput {
  state: string;
  /** Provider-specific payload — an OAuth `code` for a real provider, or a
   *  simulated username for the mock provider. */
  [key: string]: unknown;
}

export interface ConnectedAccountData {
  platformAccountId: string;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  /** Raw access token as returned by the platform. The caller is responsible
   *  for encrypting this before persisting it — providers must never persist
   *  it themselves. */
  accessToken: string;
}

/**
 * Contract every social platform integration must implement. The generic
 * SocialAccountsService only ever talks to this interface, never to a
 * concrete platform's SDK/API directly — that keeps adding a new platform an
 * additive change (a new class + registry entry) instead of a rewrite.
 */
export interface SocialPlatformProvider {
  readonly platform: SocialPlatform;
  initiateConnection(userId: string): Promise<InitiateConnectionResult>;
  completeConnection(userId: string, input: CompleteConnectionInput): Promise<ConnectedAccountData>;
}
