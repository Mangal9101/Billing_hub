import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { getServerSession } from '@/lib/server-session';
import {
  supabaseAuthUserWithRefresh,
  verifyCompanyMembership,
  verifyBusinessOwner,
  supabaseAdmin,
} from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function hashOtp(otp: string, challengeId: string) {
  return createHash('sha256')
    .update(`${challengeId}:${otp}:${process.env.BILLING_HUB_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`)
    .digest('hex');
}

function sameHash(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const otp = String(body?.otp || '').trim();
    const upiId = String(body?.upiId || '').trim().toLowerCase();

    if (!/^\d{6}$/.test(otp)) return NextResponse.json({ error: 'Enter a valid 6-digit OTP.' }, { status: 400 });
    if (!upiId) return NextResponse.json({ error: 'UPI ID is required.' }, { status: 400 });

    const serverSession = await getServerSession();
    let uid = '';
    let email = '';
    let sessionCompanyId = '';
    let sessionRole = '';

    if (serverSession) {
      uid = serverSession.uid;
      email = serverSession.email;
      sessionCompanyId = serverSession.companyId;
      sessionRole = serverSession.role;
    } else {
      const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
      const refreshToken = (req.headers.get('x-refresh-token') || '').trim();
      if (!token) return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
      const auth = await supabaseAuthUserWithRefresh(token, refreshToken);
      if (!auth.user?.id || !auth.user.email) return NextResponse.json({ error: 'Invalid authentication session. Please sign in again.' }, { status: 401 });
      uid = String(auth.user.id);
      email = String(auth.user.email);
    }

    const membership = await verifyCompanyMembership(uid);
    if (!membership?.business_id) return NextResponse.json({ error: 'Business membership not found.' }, { status: 403 });

    const businessId = String(membership.business_id);
    const role = sessionRole || String(membership.role || '').toLowerCase();
    if (sessionCompanyId && sessionCompanyId !== businessId) return NextResponse.json({ error: 'Business session mismatch.' }, { status: 403 });
    if (role === 'owner' && !(await verifyBusinessOwner(uid, businessId))) {
      return NextResponse.json({ error: 'Only the business owner can confirm this UPI change.' }, { status: 403 });
    }

    const result = await supabaseAdmin(
      `upi_verification_otps?business_id=eq.${encodeURIComponent(businessId)}&requested_by=eq.${encodeURIComponent(uid)}&consumed_at=is.null&order=created_at.desc&limit=1`
    );
    if (!result.ok) throw new Error('Unable to load the UPI verification request.');
    const rows = await result.json();
    const challenge = rows?.[0];

    if (!challenge) return NextResponse.json({ error: 'No active UPI verification request. Please request a new OTP.' }, { status: 400 });
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await supabaseAdmin(`upi_verification_otps?id=eq.${encodeURIComponent(challenge.id)}`, { method: 'PATCH', body: JSON.stringify({ consumed_at: new Date().toISOString() }) });
      return NextResponse.json({ error: 'OTP expired. Please request a new OTP.' }, { status: 400 });
    }
    if (String(challenge.upi_id).trim().toLowerCase() !== upiId) {
      return NextResponse.json({ error: 'This OTP was issued for a different UPI ID. Please request a new OTP.' }, { status: 400 });
    }

    const attempts = Number(challenge.attempts || 0);
    if (attempts >= 5) {
      await supabaseAdmin(`upi_verification_otps?id=eq.${encodeURIComponent(challenge.id)}`, { method: 'PATCH', body: JSON.stringify({ consumed_at: new Date().toISOString() }) });
      return NextResponse.json({ error: 'Too many incorrect OTP attempts. Please request a new OTP.' }, { status: 429 });
    }

    const expected = hashOtp(otp, String(challenge.id));
    if (!sameHash(expected, String(challenge.otp_hash || ''))) {
      await supabaseAdmin(
        `upi_verification_otps?id=eq.${encodeURIComponent(challenge.id)}`,
        { method: 'PATCH', body: JSON.stringify({ attempts: attempts + 1 }) }
      );
      return NextResponse.json({ error: attempts + 1 >= 5 ? 'Too many incorrect OTP attempts. Please request a new OTP.' : 'Invalid OTP. Please check the code and try again.' }, { status: attempts + 1 >= 5 ? 429 : 400 });
    }

    await supabaseAdmin(
      `upi_verification_otps?id=eq.${encodeURIComponent(challenge.id)}`,
      { method: 'PATCH', body: JSON.stringify({ consumed_at: new Date().toISOString() }) }
    );

    return NextResponse.json({ ok: true, verified: true, email, upiId });
  } catch (e: any) {
    console.error('UPI OTP VERIFY ERROR:', e);
    return NextResponse.json({ error: e?.message || 'Unable to verify UPI confirmation OTP.' }, { status: 500 });
  }
}
