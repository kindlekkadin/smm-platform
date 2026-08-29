import { SocialAccount } from '@prisma/client';

export type PublicSocialAccount = Pick<
  SocialAccount,
  | 'id'
  | 'userId'
  | 'platform'
  | 'platformAccountId'
  | 'username'
  | 'displayName'
  | 'profileImageUrl'
  | 'status'
  | 'connectedAt'
  | 'disconnectedAt'
  | 'updatedAt'
>;

export function toPublicSocialAccount(account: SocialAccount): PublicSocialAccount {
  const {
    id,
    userId,
    platform,
    platformAccountId,
    username,
    displayName,
    profileImageUrl,
    status,
    connectedAt,
    disconnectedAt,
    updatedAt,
  } = account;
  return {
    id,
    userId,
    platform,
    platformAccountId,
    username,
    displayName,
    profileImageUrl,
    status,
    connectedAt,
    disconnectedAt,
    updatedAt,
  };
}
