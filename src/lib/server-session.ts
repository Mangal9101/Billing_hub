import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'billing_hub_server_session';
const MAX_AGE = 60 * 60 * 24 * 30;

type ServerSession = {
  uid: string;
  email: string;
  companyId: string;
  role: string;
  exp: number;
};

function secret() {
  const value = process.env.BILLING_HUB_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!value) throw new Error('BILLING_HUB_SESSION_SECRET is not configured.');
  return value;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createServerSession(value: Omit<ServerSession, 'exp'>) {
  const payload = Buffer.from(JSON.stringify({ ...value, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readServerSession(raw?: string | null): ServerSession | null {
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  try {
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ServerSession;
    if (!value?.uid || !value?.companyId || !value?.email || !value?.exp || value.exp <= Math.floor(Date.now() / 1000)) return null;
    return value;
  } catch {
    return null;
  }
}

export async function getServerSession() {
  const store = await cookies();
  return readServerSession(store.get(COOKIE_NAME)?.value);
}

export async function setServerSession(value: Omit<ServerSession, 'exp'>) {
  const store = await cookies();
  store.set(COOKIE_NAME, createServerSession(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearServerSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}

export { COOKIE_NAME };