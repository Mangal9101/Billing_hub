import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAuthUser, verifyCompanyMembership } from '@/lib/server-supabase';

const ADMIN_EMAIL = 'mkp94065@gmail.com';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

function isSubscriptionActive(subscription: any) {
  if (!subscription) return false;
  if (subscription.lifetime === true || String(subscription.plan || '').toLowerCase() === 'lifetime') return true;
  return ['active', 'trialing'].includes(String(subscription.status || '').toLowerCase());
}

export async function GET(req: NextRequest) {
  try {
    const user = await supabaseAuthUser(bearer(req));
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Subscription belongs to the business, not to an individual staff account.
    // Both owners and staff resolve to the same business_members.business_id.
    const membership = await verifyCompanyMembership(user.id);
    if (!membership?.business_id) {
      return NextResponse.json({ subscription: null }, { status: 200 });
    }

    const businessId = String(membership.business_id);

    // The admin-owned business is lifetime and therefore never blocked by subscription gating.
    const owner = await supabaseAdmin(
      `businesses?id=eq.${encodeURIComponent(businessId)}&select=owner_id&limit=1`
    );
    if (owner.ok) {
      const ownerRows = await owner.json().catch(() => []);
      const ownerId = ownerRows?.[0]?.owner_id;
      if (ownerId) {
        const ownerAuth = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(ownerId)}`, {
          headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` },
          cache: 'no-store',
        });
        const ownerJson = await ownerAuth.json().catch(() => ({}));
        if (String(ownerJson?.email || '').trim().toLowerCase() === ADMIN_EMAIL) {
          return NextResponse.json({ subscription: { plan: 'lifetime', status: 'active', lifetime: true }, businessId, active: true });
        }
      }
    }

    const r = await supabaseAdmin(
      `business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload&limit=1`
    );
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });

    const rows = await r.json().catch(() => []);
    const subscription = rows?.[0]?.payload?.subscription || null;

    return NextResponse.json({
      subscription,
      businessId,
      active: isSubscriptionActive(subscription),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to load subscription status.' }, { status: 500 });
  }
}
