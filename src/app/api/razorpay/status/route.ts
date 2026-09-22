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

  const status = String(subscription.status || '').toLowerCase();
  if (!['active', 'trialing'].includes(status)) return false;

  // A cancelled paid subscription remains active only until the already-paid
  // period ends. A cancelled trial is stored as cancelled immediately.
  if (subscription.autoPayCancelled) {
    // A cancelled trial is immediately inactive. A paid subscription remains
    // active only until the already-paid billing period ends.
    if (subscription.isTrial) return false;
    if (subscription.currentPeriodEndsAt) {
      const end = new Date(String(subscription.currentPeriodEndsAt)).getTime();
      if (Number.isFinite(end) && Date.now() >= end) return false;
    }
  }

  if (subscription.isTrial && subscription.trialEndsAt) {
    const end = new Date(String(subscription.trialEndsAt)).getTime();
    if (Number.isFinite(end) && Date.now() >= end) return false;
  }

  return true;
}

export async function GET(req: NextRequest) {
  try {
    const user = await supabaseAuthUser(bearer(req));
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // This account is an explicit Billing Hub Lifetime account. Resolve it
    // before the business-membership lookup so a temporary/missing membership
    // lookup can never hide the Lifetime status on Plans & Billing.
    if (String(user.email || '').trim().toLowerCase() === ADMIN_EMAIL) {
      return NextResponse.json({
        subscription: {
          plan: 'lifetime',
          status: 'active',
          lifetime: true,
          updatedAt: new Date().toISOString(),
        },
        businessId: null,
        active: true,
      });
    }

    // Subscription belongs to the business, not to an individual staff account.
    // Both owners and staff resolve to the same business_members.business_id.
    const membership = await verifyCompanyMembership(user.id);
    if (!membership?.business_id) {
      return NextResponse.json({ subscription: null }, { status: 200 });
    }

    const businessId = String(membership.business_id);

    // Staff accounts still need to resolve the business owner because their
    // own email is not the owner email.
    const role = String((membership as any)?.role || '').toLowerCase();
    const dataResponse = await supabaseAdmin(
      'business_data?business_id=eq.' + encodeURIComponent(businessId) + '&select=payload&limit=1'
    );

    if (role !== 'owner') {
      const owner = await supabaseAdmin(
        'businesses?id=eq.' + encodeURIComponent(businessId) + '&select=owner_id&limit=1'
      );
      let ownerId = '';
      if (owner.ok) {
        const ownerRows = await owner.json().catch(() => []);
        ownerId = String(ownerRows?.[0]?.owner_id || '');
      }

      if (ownerId) {
        const ownerAuth = await fetch(
          process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/admin/users/' + encodeURIComponent(ownerId),
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
              Authorization: 'Bearer ' + (process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
            },
            cache: 'no-store',
          }
        );
        const ownerJson = await ownerAuth.json().catch(() => ({}));
        if (String(ownerJson?.email || '').trim().toLowerCase() === ADMIN_EMAIL) {
          return NextResponse.json({
            subscription: { plan: 'lifetime', status: 'active', lifetime: true },
            businessId,
            active: true,
          });
        }
      }
    }

    if (!dataResponse.ok) return NextResponse.json({ error: await dataResponse.text() }, { status: 500 });

    const rows = await dataResponse.json().catch(() => []);
    const payload = rows?.[0]?.payload || {};
    let subscription = payload?.subscription || null;

    // Free access is handled by Billing Hub itself. It is NOT a Razorpay
    // subscription and never collects ₹2 or creates an AutoPay mandate.
    if (!subscription && role === 'owner') {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      subscription = {
        plan: 'free_trial',
        status: 'active',
        isTrial: true,
        freeTrial: true,
        trialEndsAt,
        activatedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await supabaseAdmin(
        `business_data?business_id=eq.${encodeURIComponent(businessId)}`,
        { method: 'PATCH', body: JSON.stringify({ payload: { ...payload, subscription }, updated_at: now.toISOString() }) }
      );
    }

    return NextResponse.json({
      subscription,
      businessId,
      active: isSubscriptionActive(subscription),
      trialEligible: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to load subscription status.' }, { status: 500 });
  }
}
