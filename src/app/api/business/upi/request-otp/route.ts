import { NextRequest, NextResponse } from 'next/server';
import { randomInt, createHash } from 'node:crypto';
import { getServerSession } from '@/lib/server-session';
import {
  supabaseAuthUserWithRefresh,
  verifyCompanyMembership,
  verifyBusinessOwner,
  supabaseAdmin,
  SUPABASE_URL,
} from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function hashOtp(otp: string, challengeId: string) {
  return createHash('sha256')
    .update(`${challengeId}:${otp}:${process.env.BILLING_HUB_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`)
    .digest('hex');
}

async function ownerEmailForBusiness(businessId: string, currentUser: any, role: string) {
  if (role === 'owner') return String(currentUser?.email || '').trim().toLowerCase();

  const businessResponse = await supabaseAdmin(
    `businesses?id=eq.${encodeURIComponent(businessId)}&select=owner_id&limit=1`
  );
  if (!businessResponse.ok) throw new Error('Unable to verify business owner.');
  const rows = await businessResponse.json();
  const ownerId = String(rows?.[0]?.owner_id || '');
  if (!ownerId) throw new Error('Business owner could not be found.');

  const authResponse = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(ownerId)}`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
      },
      cache: 'no-store',
    }
  );
  if (!authResponse.ok) throw new Error('Unable to find the business owner email.');
  const owner = await authResponse.json();
  return String(owner?.email || '').trim().toLowerCase();
}

function emailHtml(otp: string, upiId: string, expiresMinutes: number) {
  const safeUpi = upiId.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
  return `<!doctype html>
<html><body style="margin:0;background:#f5f1ed;font-family:Arial,Helvetica,sans-serif;color:#33251f">
<div style="max-width:620px;margin:0 auto;padding:34px 18px">
  <div style="background:#fff;border:1px solid #e7ddd5;border-radius:20px;overflow:hidden">
    <div style="padding:30px 26px;text-align:center;border-bottom:1px solid #eee5de">
      <img src="https://billing-hub.in/icon-512.png" width="64" height="64" alt="Billing Hub" style="object-fit:contain;display:block;margin:0 auto 12px">
      <div style="font-size:24px;font-weight:800;color:#5b3525">Billing Hub</div>
      <div style="font-size:11px;letter-spacing:1.5px;color:#8a6a59;margin-top:4px">BILL. MANAGE. GROW.</div>
    </div>
    <div style="padding:30px 26px">
      <h1 style="font-size:22px;margin:0 0 10px;color:#33251f">Verify your UPI ID</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 18px;color:#6f5c51">You requested to add or change the UPI ID in your Billing Hub business settings.</p>
      <div style="background:#f8f3ef;border:1px solid #eadfd6;border-radius:12px;padding:14px 16px;margin-bottom:22px">
        <div style="font-size:11px;color:#8a6a59;margin-bottom:5px">UPI ID</div>
        <div style="font-size:16px;font-weight:700;color:#4b2d20;word-break:break-all">${safeUpi}</div>
      </div>
      <div style="text-align:center;margin:24px 0">
        <div style="font-size:11px;color:#8a6a59;margin-bottom:8px">Your verification OTP</div>
        <div style="display:inline-block;background:#5b3525;color:#fff;border-radius:12px;padding:15px 22px;font-size:30px;font-weight:800;letter-spacing:7px">${otp.slice(0,3)} - ${otp.slice(3)}</div>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#7b6a61">This OTP expires in ${expiresMinutes} minutes and can be used only once. If you did not request this change, you can safely ignore this email.</p>
    </div>
    <div style="padding:18px 26px;background:#faf7f4;color:#927e72;font-size:11px;text-align:center">Billing Hub · Secure UPI verification</div>
  </div>
</div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const upiId = String(body?.upiId || '').trim().toLowerCase();
    if (!upiId) return NextResponse.json({ error: 'UPI ID is required.' }, { status: 400 });

    const serverSession = await getServerSession();
    let user: any = null;
    let sessionCompanyId = '';
    let sessionRole = '';

    if (serverSession) {
      user = { id: serverSession.uid, email: serverSession.email };
      sessionCompanyId = serverSession.companyId;
      sessionRole = serverSession.role;
    } else {
      const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
      const refreshToken = (req.headers.get('x-refresh-token') || '').trim();
      if (!token) return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
      const auth = await supabaseAuthUserWithRefresh(token, refreshToken);
      user = auth.user;
      if (!user?.id || !user.email) return NextResponse.json({ error: 'Invalid authentication session. Please sign in again.' }, { status: 401 });
    }

    const membership = await verifyCompanyMembership(String(user.id));
    if (!membership?.business_id) return NextResponse.json({ error: 'Business membership not found.' }, { status: 403 });

    const businessId = String(membership.business_id);
    const role = sessionRole || String(membership.role || '').toLowerCase();
    if (sessionCompanyId && sessionCompanyId !== businessId) return NextResponse.json({ error: 'Business session mismatch.' }, { status: 403 });
    if (role === 'owner' && !(await verifyBusinessOwner(String(user.id), businessId))) {
      return NextResponse.json({ error: 'Only the business owner can confirm this UPI change.' }, { status: 403 });
    }

    const email = await ownerEmailForBusiness(businessId, user, role);
    if (!email) return NextResponse.json({ error: 'Business owner email is not available.' }, { status: 400 });

    const existing = await supabaseAdmin(
      `upi_verification_otps?business_id=eq.${encodeURIComponent(businessId)}&requested_by=eq.${encodeURIComponent(String(user.id))}&consumed_at=is.null&select=id,created_at&order=created_at.desc&limit=1`
    );
    if (existing.ok) {
      const oldRows = await existing.json();
      if (Array.isArray(oldRows) && oldRows.length) {
        const createdAt = new Date(String(oldRows[0]?.created_at || '')).getTime();
        if (Number.isFinite(createdAt) && Date.now() - createdAt < 60_000) {
          return NextResponse.json({ error: 'Please wait a minute before requesting another OTP.' }, { status: 429 });
        }
        await supabaseAdmin(
          `upi_verification_otps?business_id=eq.${encodeURIComponent(businessId)}&requested_by=eq.${encodeURIComponent(String(user.id))}&consumed_at=is.null`,
          { method: 'PATCH', body: JSON.stringify({ consumed_at: new Date().toISOString() }) }
        );
      }
    }

    const id = crypto.randomUUID();
    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const insert = await supabaseAdmin('upi_verification_otps', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id,
        business_id: businessId,
        requested_by: String(user.id),
        owner_email: email,
        upi_id: upiId,
        otp_hash: hashOtp(otp, id),
        expires_at: expiresAt,
        attempts: 0,
      }),
    });
    if (!insert.ok) throw new Error('Unable to create the UPI verification request.');

    const apiKey = process.env.RESEND_API_KEY || '';
    const from = process.env.RESEND_FROM_EMAIL || 'Billing Hub <support@billinghub.in>';
    if (!apiKey) {
      await supabaseAdmin(`upi_verification_otps?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ error: 'UPI email service is not configured. Add RESEND_API_KEY in Vercel and verify billinghub.in in Resend.' }, { status: 500 });
    }

    const mail = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Billing Hub: Verify UPI ID ${upiId}`,
        html: emailHtml(otp, upiId, 10),
      }),
      cache: 'no-store',
    });
    const mailJson = await mail.json().catch(() => ({}));
    if (!mail.ok) {
      await supabaseAdmin(`upi_verification_otps?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ error: mailJson?.message || 'Unable to send the UPI verification email.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, email, message: 'UPI verification OTP sent to the business owner email.' });
  } catch (e: any) {
    console.error('UPI OTP REQUEST ERROR:', e);
    return NextResponse.json({ error: e?.message || 'Unable to send UPI confirmation OTP.' }, { status: 500 });
  }
}
