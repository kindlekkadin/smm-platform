import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { SocialPlatform } from '@prisma/client';
import {
  CompleteConnectionInput,
  ConnectedAccountData,
  InitiateConnectionResult,
  SocialPlatformProvider,
} from './social-platform-provider.interface';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface PendingState {
  userId: string;
  expiresAt: number;
}

/**
 * DEVELOPMENT / TEST ONLY.
 *
 * Simulates an OAuth-style connect flow without contacting any real social
 * platform. No developer credentials exist in this environment for any real
 * platform (Instagram/TikTok/YouTube/Facebook/X all require a registered app
 * + client secret we don't have), so this provider exists purely to exercise
 * the SocialAccountsService and API surface end to end. It must never be
 * presented to users as a real platform connection.
 *
 * Pending "authorization" state is kept in memory (a single Nest process is
 * assumed for local dev) and expires after STATE_TTL_MS.
 *
 * See ../PLATFORM_INTEGRATION.md for what's required to add a real provider.
 */
@Injectable()
export class DevMockProvider implements SocialPlatformProvider {
  readonly platform = SocialPlatform.DEV_MOCK;

  private readonly pendingStates = new Map<string, PendingState>();

  async initiateConnection(userId: string): Promise<InitiateConnectionResult> {
    const state = randomUUID();
    this.pendingStates.set(state, { userId, expiresAt: Date.now() + STATE_TTL_MS });

    return {
      // In-app route — a real provider would return an external OAuth URL here.
      authorizationUrl: `/social-accounts/mock-consent?state=${state}`,
      state,
    };
  }

  async completeConnection(
    userId: string,
    input: CompleteConnectionInput,
  ): Promise<ConnectedAccountData> {
    const pending = this.pendingStates.get(input.state);
    if (!pending) {
      throw new BadRequestException('Unknown or already-used connection state');
    }
    if (pending.expiresAt < Date.now()) {
      this.pendingStates.delete(input.state);
      throw new BadRequestException('Connection state has expired, please try again');
    }
    if (pending.userId !== userId) {
      throw new BadRequestException('Connection state does not belong to this user');
    }

    this.pendingStates.delete(input.state);

    const mockUsername =
      typeof input.mockUsername === 'string' && input.mockUsername.trim().length > 0
        ? input.mockUsername.trim()
        : `mock_user_${randomUUID().slice(0, 8)}`;

    return {
      platformAccountId: `dev-mock-${mockUsername}`,
      username: mockUsername,
      displayName: mockUsername,
      profileImageUrl: undefined,
      accessToken: randomBytes(24).toString('hex'),
    };
  }
}
