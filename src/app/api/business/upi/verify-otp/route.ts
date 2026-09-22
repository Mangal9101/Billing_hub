import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthUserWithRefresh, verifyCompanyMembership, verifyBusinessOwner, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const refreshToken = (req.headers.get('x-refresh-token') || '').trim();
    const body = await req.json().catch(() => ({}));
    const otp = String(body?.otp || '').trim();

    if (!token) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (!/^\d{6}$/.test(otp)) return NextResponse.json({ error: 'Enter a valid 6-digit OTP.' }, { status: 400 });

    const auth = await supabaseAuthUserWithRefresh(token, refreshToken);
    const user = auth.user;
    if (!user?.id || !user.email) return NextResponse.json({ error: 'Invalid authentication session. Please sign in again.' }, { status: 401 });

    const membership = await verifyCompanyMembership(String(user.id));
    if (!membership?.business_id) return NextResponse.json({ error: 'Business membership not found.' }, { status: 403 });

    const businessId = String(membership.business_id);
    const role = String(membership.role || '').toLowerCase();
    if (role === 'owner') {
      const isOwner = await verifyBusinessOwner(String(user.id), businessId);
      if (!isOwner) return NextResponse.json({ error: 'Only the business owner can confirm this UPI change.' }, { status: 403 });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Supabase authentication is not configured.' }, { status: 500 });
    }

    // The OTP is sent to the business owner's email. For staff, resolve that
    // email from the business owner rather than trusting an email supplied by
    // the browser.
    let email = String(user.email).trim().toLowerCase();
    if (role !== 'owner') {
      const businessResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=owner_id&limit=1`,
        { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` }, cache: 'no-store' }
      );
      if (!businessResponse.ok) return NextResponse.json({ error: 'Unable to verify business owner.' }, { status: 500 });
      const businessRows = await businessResponse.json();
      const ownerId = String(businessRows?.[0]?.owner_id || '');
      if (!ownerId) return NextResponse.json({ error: 'Business owner could not be found.' }, { status: 400 });

      const ownerResponse = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(ownerId)}`,
        { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` }, cache: 'no-store' }
      );
      if (!ownerResponse.ok) return NextResponse.json({ error: 'Unable to find the business owner email.' }, { status: 500 });
      const owner = await ownerResponse.json();
      email = String(owner?.email || '').trim().toLowerCase();
    }

    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token: otp, type: 'email' }),
      cache: 'no-store',
    });
    const json = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok) {
      return NextResponse.json(
        { error: json?.msg || json?.message || json?.error_description || 'Invalid or expired OTP.' },
        { status: authResponse.status }
      );
    }

    // The OTP must authenticate the business owner email, not merely any
    // valid OTP. This keeps staff from confirming a different account's OTP.
    const verifiedEmail = String(json?.user?.email || '').trim().toLowerCase();
    if (!verifiedEmail || verifiedEmail !== email) {
      return NextResponse.json({ error: 'The OTP does not match the business owner email.' }, { status: 403 });
    }

    return NextResponse.json({ ok: true, verified: true, accessToken: auth.accessToken });
  } catch (e: any) {
    console.error('UPI OTP VERIFY ERROR:', e);
    return NextResponse.json({ error: e?.message || 'Unable to verify UPI confirmation OTP.' }, { status: 500 });
  }
}
