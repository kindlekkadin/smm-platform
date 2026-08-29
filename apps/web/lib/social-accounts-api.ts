import { request } from './api';

export type SocialPlatform = 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'FACEBOOK' | 'X' | 'DEV_MOCK';
export type SocialAccountStatus = 'ACTIVE' | 'DISCONNECTED';

export interface SocialAccount {
  id: string;
  userId: string;
  platform: SocialPlatform;
  platformAccountId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  status: SocialAccountStatus;
  connectedAt: string;
  disconnectedAt: string | null;
  updatedAt: string;
}

export function listSocialAccounts() {
  return request<{ accounts: SocialAccount[] }>('/api/social-accounts');
}

export function initiateConnection(platform: SocialPlatform) {
  return request<{ authorizationUrl: string; state: string }>(
    `/api/social-accounts/${platform}/connect`,
    { method: 'POST' },
  );
}

export function completeConnection(
  platform: SocialPlatform,
  input: { state: string; mockUsername?: string },
) {
  return request<{ account: SocialAccount }>(`/api/social-accounts/${platform}/connect/complete`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function disconnectSocialAccount(id: string) {
  return request<{ account: SocialAccount }>(`/api/social-accounts/${id}`, { method: 'DELETE' });
}
