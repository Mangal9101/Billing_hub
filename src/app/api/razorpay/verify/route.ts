import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthUser, verifyCompanyMembership, supabaseAdmin } from '@/lib/server-supabase';
import { verifyCheckoutSignature } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\\s+/i, '').trim();
}

async function ownerContext(req: NextRequest) {
  const user = await supabaseAuthUser(bearer(req));
  if (!user?.id) return null;
  const membership = await verifyCompanyMembership(user.id);
  if (!membership || String(membership.role || '').toLowerCase() !== 'owner') return null;
  return { user, businessId: String(membership.business_id) };
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
  await supabaseAdmin(`business_data?business_id=eq.${encodeURIComponent(businessId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ payload: next, updated_at: new Date().toISOString() }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await ownerContext(req);
    if (!ctx) return NextResponse.json({ error: 'Owner access required.' }, { status: 403 });
    const body = await req.json().catch(() => ({}));

    if (body?.type === 'subscription') {
      const paymentId = String(body?.razorpay_payment_id || '');
      const subscriptionId = String(body?.razorpay_subscription_id || '');
      const signature = String(body?.razorpay_signature || '');
      if (!paymentId || !subscriptionId || !signature) return NextResponse.json({ error: 'Incomplete payment response.' }, { status: 400 });
      if (!verifyCheckoutSignature(`${paymentId}|${subscriptionId}`, signature)) {
        return NextResponse.json({ error: 'Invalid Razorpay signature.' }, { status: 400 });
      }
      await saveSubscription(ctx.businessId, {
        status: 'active',
        plan: String(body?.plan || 'monthly'),
        razorpaySubscriptionId: subscriptionId,
        lastPaymentId: paymentId,
      });
      return NextResponse.json({ ok: true });
    }

    const orderId = String(body?.razorpay_order_id || '');
    const paymentId = String(body?.razorpay_payment_id || '');
    const signature = String(body?.razorpay_signature || '');
    if (!orderId || !paymentId || !signature) return NextResponse.json({ error: 'Incomplete payment response.' }, { status: 400 });
    if (!verifyCheckoutSignature(`${orderId}|${paymentId}`, signature)) {
      return NextResponse.json({ error: 'Invalid Razorpay signature.' }, { status: 400 });
    }

    await saveSubscription(ctx.businessId, {
      status: 'active',
      plan: 'lifetime',
      razorpayOrderId: orderId,
      lastPaymentId: paymentId,
      lifetime: true,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to verify payment.' }, { status: 500 });
  }
}
