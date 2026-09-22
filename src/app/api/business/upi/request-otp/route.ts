import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthUser, verifyCompanyMembership, verifyBusinessOwner, supabaseAdmin, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

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
    { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` }, cache: 'no-store' }
  );
  if (!authResponse.ok) throw new Error('Unable to find the business owner email.');
  const owner = await authResponse.json();
  return String(owner?.email || '').trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const user = await supabaseAuthUser(token);
    if (!user?.id || !user.email) return NextResponse.json({ error: 'Invalid authentication session.' }, { status: 401 });

    const membership = await verifyCompanyMembership(String(user.id));
    if (!membership?.business_id) return NextResponse.json({ error: 'Business membership not found.' }, { status: 403 });

    const businessId = String(membership.business_id);
    const role = String(membership.role || '').toLowerCase();
    if (role === 'owner') {
      const isOwner = await verifyBusinessOwner(String(user.id), businessId);
      if (!isOwner) return NextResponse.json({ error: 'Only the business owner can confirm this UPI change.' }, { status: 403 });
    }

    const email = await ownerEmailForBusiness(businessId, user, role);
    if (!email) return NextResponse.json({ error: 'Business owner email is not available.' }, { status: 400 });

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Supabase authentication is not configured.' }, { status: 500 });
    }

    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, create_user: false }),
      cache: 'no-store',
    });
    const json = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok) {
      return NextResponse.json(
        { error: json?.msg || json?.message || json?.error_description || 'Unable to send UPI confirmation OTP.' },
        { status: authResponse.status }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      message: 'UPI confirmation OTP sent to the business owner email.',
    });
  } catch (e: any) {
    console.error('UPI OTP REQUEST ERROR:', e);
    return NextResponse.json({ error: e?.message || 'Unable to send UPI confirmation OTP.' }, { status: 500 });
  }
}
