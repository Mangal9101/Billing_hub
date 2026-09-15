import { NextRequest, NextResponse } from 'next/server';
import { defaultPermissions, sanitizeStaffPermissions } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

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

    // Login IDs are business-scoped in the database. If the same ID was used in
    // more than one business, do not guess which business the staff member meant.
    if (rows.length > 1) {
      return NextResponse.json({ error: 'This Staff Login ID is used in more than one business. Ask the business owner to use a unique Login ID.' }, { status: 409 });
    }

    const staff = rows[0];
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
