import { NextRequest, NextResponse } from 'next/server';
import { defaultPermissions, sanitizeStaffPermissions } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function isSubscriptionActive(subscription: any) {
  if (!subscription) return false;
  if (subscription.lifetime === true || String(subscription.plan || '').toLowerCase() === 'lifetime') return true;
  return ['active', 'trialing'].includes(String(subscription.status || '').toLowerCase());
}

async function getBusinessSubscription(businessId: string) {
  const r = await supabaseAdmin(
    `business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload&limit=1`
  );
  if (!r.ok) throw new Error('Unable to verify business subscription.');
  const rows = await r.json().catch(() => []);
  return rows?.[0]?.payload?.subscription || null;
}

export async function POST(req: NextRequest) {
  try {
    const { loginId, password } = await req.json();
    const clean = String(loginId || '').trim().toLowerCase();
    if (!clean || !password) {
      return NextResponse.json({ error: 'Login ID and password are required.' }, { status: 400 });
    }

    const r = await supabaseAdmin(
      `staff_profiles?login_id=eq.${encodeURIComponent(clean)}&status=eq.Active&select=id,user_id,business_id,name,email,role,permissions&order=created_at.asc`
    );
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
    const rows = await r.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Invalid Login ID or inactive staff account.' }, { status: 401 });
    }

    if (rows.length > 1) {
      return NextResponse.json({ error: 'This Staff Login ID is used in more than one business. Ask the business owner to use a unique Login ID.' }, { status: 409 });
    }

    const staff = rows[0];

    // Staff do not have their own subscription. Their access is controlled by
    // the subscription of the business they belong to.
    const subscription = await getBusinessSubscription(String(staff.business_id));
    if (!isSubscriptionActive(subscription)) {
      return NextResponse.json({
        error: 'This business subscription is inactive or expired. Please ask the business owner to renew the subscription.',
        code: 'BUSINESS_SUBSCRIPTION_INACTIVE',
      }, { status: 403 });
    }

    const email = `staff.${clean}.${staff.business_id.replace(/[^a-z0-9]/gi, '').slice(-18)}@staff.sawariya.app`;
    const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const tokenJson = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenJson.access_token) {
      return NextResponse.json({ error: 'Invalid Login ID or password.' }, { status: 401 });
    }

    const role = String(staff.role || 'cashier').toLowerCase() as any;
    const permissions = sanitizeStaffPermissions(role, staff.permissions);

    return NextResponse.json({
      ok: true,
      uid: staff.user_id,
      email: staff.email || email,
      name: staff.name,
      role,
      companyId: staff.business_id,
      permissions: permissions.length ? permissions : defaultPermissions(role),
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      isOwner: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Staff login failed.' }, { status: 500 });
  }
}
