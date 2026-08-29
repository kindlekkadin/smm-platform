import { User } from '@prisma/client';

export type PublicUser = Pick<
  User,
  'id' | 'email' | 'displayName' | 'role' | 'status' | 'emailVerified' | 'createdAt'
>;

export function toPublicUser(user: User): PublicUser {
  const { id, email, displayName, role, status, emailVerified, createdAt } = user;
  return { id, email, displayName, role, status, emailVerified, createdAt };
}

export type AuthenticatedUser = PublicUser & { sessionId: string };
