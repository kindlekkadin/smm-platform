import { API_URL } from './config';

export type UserRole = 'CUSTOMER' | 'CREATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? message);
    } catch {
      // response had no JSON body; keep the generic message
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function register(input: {
  email: string;
  password: string;
  displayName: string;
  role?: 'CUSTOMER' | 'CREATOR';
}) {
  return request<{ user: CurrentUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return request<{ user: CurrentUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function logout() {
  return request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
}

export function fetchCurrentUser() {
  return request<{ user: CurrentUser }>('/api/auth/me');
}
