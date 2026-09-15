'use client';

import { defaultPermissions, type AppRole, type Permission } from '@/lib/permissions';

export type { AppRole, Permission } from '@/lib/permissions';

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
  role: AppRole;
  companyId: string;
  permissions: Permission[];
  accessToken: string;
  refreshToken?: string;
  isOwner: boolean;
};

const SESSION_KEY = 'billing_hub_session_v4';
const DEVICE_KEY = 'billing_hub_device_v1';
const REFRESH_KEY = 'billing_hub_refresh_token_v4';

export { defaultPermissions };

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session: SessionUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem('billing_hub_access_token_v4', session.accessToken);
  if (session.refreshToken) localStorage.setItem(REFRESH_KEY, session.refreshToken);
  localStorage.setItem('billing_hub_user_v4', session.uid);
  localStorage.setItem('sawariya_access_token_v3', session.accessToken);
  localStorage.setItem('sawariya_user_v3', session.uid);
  window.dispatchEvent(new Event('sawariya-auth'));
}

export function updateAccessToken(accessToken: string, refreshToken?: string) {
  const current = getSession();
  if (!current || !accessToken) return;
  setSession({ ...current, accessToken, refreshToken: refreshToken || current.refreshToken });
}

export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const session = getSession();
  const refreshToken = session?.refreshToken || localStorage.getItem(REFRESH_KEY);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!refreshToken || !supabaseUrl || !supabaseKey) return null;

  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: 'no-store',
      }
    );
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.access_token) return null;
    updateAccessToken(json.access_token, json.refresh_token || refreshToken);
    return json.access_token;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const session = getSession();
  if (!session?.accessToken) return null;

  try {
    const part = session.accessToken.split('.')[1];
    if (part) {
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        '='
      );
      const payload = JSON.parse(atob(padded));
      const expiresAt = Number(payload?.exp || 0) * 1000;
      if (expiresAt > Date.now() + 60_000) return session.accessToken;
    }
  } catch {
    // Fall through to refresh/retry.
  }

  return (await refreshAccessToken()) || session.accessToken;
}

export function updateActiveBusiness(companyId: string, role: AppRole, permissions: Permission[]) {
  const current = getSession();
  if (!current) return;
  setSession({ ...current, companyId, role, permissions, isOwner: role === 'owner' });
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('billing_hub_access_token_v4');
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('billing_hub_user_v4');
  localStorage.removeItem('sawariya_access_token_v3');
  localStorage.removeItem('sawariya_access_token_v2');
  localStorage.removeItem('sawariya_user_v3');
  localStorage.removeItem('sawariya_user_v2');
  window.dispatchEvent(new Event('sawariya-auth'));
}

export function hasPermission(permission: Permission): boolean {
  const s = getSession();
  return !!s && (s.isOwner || s.permissions.includes(permission));
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `${crypto.randomUUID()}-${Date.now()}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export const AUTH_KEYS = { SESSION_KEY, DEVICE_KEY, REFRESH_KEY };
