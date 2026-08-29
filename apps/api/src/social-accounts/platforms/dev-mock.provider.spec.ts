import { BadRequestException } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { DevMockProvider } from './dev-mock.provider';

describe('DevMockProvider', () => {
  let provider: DevMockProvider;

  beforeEach(() => {
    provider = new DevMockProvider();
  });

  it('declares the DEV_MOCK platform', () => {
    expect(provider.platform).toBe(SocialPlatform.DEV_MOCK);
  });

  it('issues a state that completeConnection can consume exactly once', async () => {
    const { state, authorizationUrl } = await provider.initiateConnection('user-1');
    expect(authorizationUrl).toContain(state);

    const result = await provider.completeConnection('user-1', { state, mockUsername: 'alice' });
    expect(result).toMatchObject({
      platformAccountId: 'dev-mock-alice',
      username: 'alice',
      displayName: 'alice',
    });
    expect(typeof result.accessToken).toBe('string');
    expect(result.accessToken.length).toBeGreaterThan(0);

    // The state was single-use — completing again must fail.
    await expect(
      provider.completeConnection('user-1', { state, mockUsername: 'alice' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown state', async () => {
    await expect(
      provider.completeConnection('user-1', { state: 'does-not-exist' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects completing a state issued to a different user', async () => {
    const { state } = await provider.initiateConnection('user-1');
    await expect(
      provider.completeConnection('user-2', { state, mockUsername: 'mallory' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generates a username when none is provided', async () => {
    const { state } = await provider.initiateConnection('user-1');
    const result = await provider.completeConnection('user-1', { state });
    expect(result.username).toMatch(/^mock_user_/);
  });
});
