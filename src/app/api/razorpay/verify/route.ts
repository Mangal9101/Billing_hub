import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthUser, verifyCompanyMembership, supabaseAdmin } from '@/lib/server-supabase';
import { verifyCheckoutSignature } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

async function paymentContext(req: NextRequest) {
  const user = await supabaseAuthUser(bearer(req));
  if (!user?.id) return null;

  const membership = await verifyCompanyMembership(user.id);
  if (!membership) return null;

  const businessId = String((membership as any).business_id || '');
  if (!businessId) return null;

  return { user, businessId };
}

async function saveSubscription(businessId: string, patch: Record<string, unknown>) {
  const r = await supabaseAdmin(`business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload&limit=1`);
  const rows = await r.json().catch(() => []);
  const payload = rows?.[0]?.payload || {};
  const next = {
    ...payload,
    subscription: {
      ...(payload.subscription || {}),
      ...patch,
      updatedAt: new Date().toISOString(),
    },
  };
  const response = await supabaseAdmin(`business_data?business_id=eq.${encodeURIComponent(businessId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ payload: next, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || 'Unable to save subscription.');
  }
  return next.subscription;
}

async function markTrialUsed(userId: string) {
  const response = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/admin/users/' + encodeURIComponent(userId),
    {
      method: 'PUT',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        Authorization: 'Bearer ' + (process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_metadata: { billing_hub_trial_used_at: new Date().toISOString() } }),
      cache: 'no-store',
    },
  );
  if (!response.ok) {
    throw new Error('Unable to record trial usage. Please contact support before retrying the trial.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await paymentContext(req);
    if (!ctx) return NextResponse.json({ error: 'Business access required.' }, { status: 403 });
    const body = await req.json().catch(() => ({}));

    if (body?.type === 'subscription') {
      const paymentId = String(body?.razorpay_payment_id || '');
      const subscriptionId = String(body?.razorpay_subscription_id || '');
      const signature = String(body?.razorpay_signature || '');
      if (!paymentId || !subscriptionId || !signature) return NextResponse.json({ error: 'Incomplete payment response.' }, { status: 400 });
      if (!verifyCheckoutSignature(`${paymentId}|${subscriptionId}`, signature)) {
        return NextResponse.json({ error: 'Invalid Razorpay signature.' }, { status: 400 });
      }
      const isTrial = Boolean(body?.trial) && String(body?.plan || '') === 'monthly';
      const trialEndsAt = isTrial && body?.trialEndsAt ? String(body.trialEndsAt) : null;
      const subscription = await saveSubscription(ctx.businessId, {
        status: 'active',
        plan: String(body?.plan || 'monthly'),
        isTrial,
        trialEndsAt,
        autoPayCancelled: false,
        razorpaySubscriptionId: subscriptionId,
        lastPaymentId: paymentId,
      });
      if (isTrial) await markTrialUsed(ctx.user.id);
      return NextResponse.json({ ok: true, subscription });
    }

    const orderId = String(body?.razorpay_order_id || '');
    const paymentId = String(body?.razorpay_payment_id || '');
    const signature = String(body?.razorpay_signature || '');
    if (!orderId || !paymentId || !signature) return NextResponse.json({ error: 'Incomplete payment response.' }, { status: 400 });
    if (!verifyCheckoutSignature(`${orderId}|${paymentId}`, signature)) {
      return NextResponse.json({ error: 'Invalid Razorpay signature.' }, { status: 400 });
    }

    const subscription = await saveSubscription(ctx.businessId, {
      status: 'active',
      plan: 'lifetime',
      razorpayOrderId: orderId,
      lastPaymentId: paymentId,
      lifetime: true,
    });
    return NextResponse.json({ ok: true, subscription });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to verify payment.' }, { status: 500 });
  }
}
