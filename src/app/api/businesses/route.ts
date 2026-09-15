import { NextRequest, NextResponse } from 'next/server';
import { defaultPermissions } from '@/lib/permissions';
import { supabaseAdmin, supabaseAuthUser } from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

export async function GET(req: NextRequest) {
  try {
    const token = bearer(req);
    const user = await supabaseAuthUser(token);
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const r = await supabaseAdmin(
      `business_members?user_id=eq.${encodeURIComponent(user.id)}&select=business_id,role,permissions&order=created_at.asc`
    );
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });

    const memberships = await r.json();
    if (!Array.isArray(memberships) || !memberships.length) {
      return NextResponse.json({ businesses: [], currentUserId: user.id });
    }

    const businesses = [];
    for (const membership of memberships) {
      const businessResponse = await supabaseAdmin(
        `businesses?id=eq.${encodeURIComponent(membership.business_id)}&select=id,name,logo_url,owner_id&limit=1`
      );
      if (!businessResponse.ok) continue;

      const rows = await businessResponse.json();
      const business = rows?.[0];
      if (!business) continue;

      const role = String(membership.role || 'owner').toLowerCase();
      const permissions =
        Array.isArray(membership.permissions) && membership.permissions.length
          ? membership.permissions
          : defaultPermissions(role as any);

      businesses.push({
        id: business.id,
        name: business.name,
        logoUrl: business.logo_url || null,
        role,
        permissions,
        isOwner: role === 'owner' || business.owner_id === user.id,
      });
    }

    return NextResponse.json({ businesses, currentUserId: user.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to load businesses.' }, { status: 500 });
  }
}
