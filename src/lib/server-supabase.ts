import { createHash, createPrivateKey, sign } from 'node:crypto';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function requireConfig() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('dummy') || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server configuration is missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}

export async function supabaseAdmin(path: string, init: RequestInit = {}) {
  requireConfig();
  const headers = new Headers(init.headers);
  headers.set('apikey', SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);
  headers.set('Content-Type', 'application/json');
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers, cache: 'no-store' });
}

export async function supabaseAuthUser(accessToken: string) {
  requireConfig();
  if (!accessToken) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!r.ok) return null;
  return r.json();
}

export async function supabaseAuthUserWithRefresh(accessToken: string, refreshToken?: string) {
  const direct = await supabaseAuthUser(accessToken);
  if (direct) return { user: direct, accessToken, refreshToken: refreshToken || null };
  if (!refreshToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) return { user: null, accessToken: null };

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.access_token) return { user: null, accessToken: null };
    const user = await supabaseAuthUser(String(json.access_token));
    return {
      user,
      accessToken: user ? String(json.access_token) : null,
      refreshToken: user ? String(json.refresh_token || refreshToken) : null,
    };
  } catch {
    return { user: null, accessToken: null };
  }
}

export async function verifyCompanyMembership(userId: string) {
  if (!userId) return null;

  // Resolve all memberships in one round trip. Prefer the owner's business
  // locally so login/data requests do not need a second Supabase query.
  const r = await supabaseAdmin(
    `business_members?user_id=eq.${encodeURIComponent(userId)}&select=business_id,role,permissions,created_at&order=created_at.asc`
  );
  if (!r.ok) throw new Error(`Unable to verify business membership: ${await r.text()}`);
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows.find((row:any) => String(row?.role || '').toLowerCase() === 'owner') || rows[0];
}

export async function verifySpecificBusinessMembership(userId: string, businessId: string) {
  if (!userId || !businessId) return null;
  const r = await supabaseAdmin(
    `business_members?user_id=eq.${encodeURIComponent(userId)}&business_id=eq.${encodeURIComponent(businessId)}&select=business_id,role,permissions&limit=1`
  );
  if (!r.ok) throw new Error(`Unable to verify business access: ${await r.text()}`);
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function getOwnerBusiness(userId: string) {
  if (!userId) return null;
  const r = await supabaseAdmin(
    `businesses?owner_id=eq.${encodeURIComponent(userId)}&select=id,name,logo_url,owner_id&order=created_at.asc&limit=1`
  );
  if (!r.ok) throw new Error(`Unable to load owned business: ${await r.text()}`);
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function verifyBusinessOwner(userId: string, businessId: string) {
  if (!userId || !businessId) return false;
  const r = await supabaseAdmin(
    `businesses?id=eq.${encodeURIComponent(businessId)}&owner_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`
  );
  if (!r.ok) return false;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length > 0;
}

export function getOwnerBusinessId(userId: string) {
  if (!userId) throw new Error('User ID is required to create a business ID.');
  return `biz-${userId}`;
}

export function hashDevice(deviceId: string) {
  return createHash('sha256').update(deviceId).digest('hex');
}

export async function createServiceAccountAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error('Google Sheets service account is not configured.');
  const privateKey = rawKey.replace(/\\n/g, '\n');
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const unsigned = `${enc(header)}.${enc(claim)}`;
  const key = createPrivateKey(privateKey);
  const signature = sign('RSA-SHA256', Buffer.from(unsigned), key).toString('base64url');
  const jwt = `${unsigned}.${signature}`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!tokenResponse.ok) throw new Error(`Google token request failed: ${await tokenResponse.text()}`);
  return (await tokenResponse.json()).access_token as string;
}
