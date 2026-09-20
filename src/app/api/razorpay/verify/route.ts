import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthUser, verifyCompanyMembership, supabaseAdmin } from '@/lib/server-supabase';
import { verifyCheckoutSignature } from '@/lib/razorpay';
import { sendBillingHubPaymentEmail } from '@/lib/billing-email';

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
      const plan = String(body?.plan || 'monthly');
      const subscription = await saveSubscription(ctx.businessId, {
        status: 'active',
        plan,
        isTrial,
        trialEndsAt,
        autoPayCancelled: false,
        trialUsedAt: isTrial ? new Date().toISOString() : undefined,
        razorpaySubscriptionId: subscriptionId,
        lastPaymentId: paymentId,
      });

      // Razorpay's customer notification is disabled. Billing Hub sends the
      // branded transactional confirmation instead. Email failure must never
      // turn a verified payment into a failed payment response.
      try {
        await sendBillingHubPaymentEmail({
          to: String(ctx.user.email || ''),
          plan,
          amount: isTrial ? 2 : plan === 'quarterly' ? 249 : plan === 'yearly' ? 899 : 99,
          paymentId,
          subscriptionId,
          nextDueAt: trialEndsAt,
          isTrial,
        });
      } catch (emailError) {
        console.error('[billing-email] Initial subscription email failed:', emailError);
      }

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

    try {
      await sendBillingHubPaymentEmail({
        to: String(ctx.user.email || ''),
        plan: 'lifetime',
        amount: 2499,
        paymentId,
      });
    } catch (emailError) {
      console.error('[billing-email] Lifetime payment email failed:', emailError);
    }

    return NextResponse.json({ ok: true, subscription });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to verify payment.' }, { status: 500 });
  }
}
