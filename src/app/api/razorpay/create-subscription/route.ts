import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthUser, verifyCompanyMembership, supabaseAdmin } from '@/lib/server-supabase';
import { RAZORPAY_KEY_ID, RAZORPAY_PLAN_IDS, razorpayRequest } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

async function context(req: NextRequest) {
  const user = await supabaseAuthUser(bearer(req));
  if (!user?.id) return null;
  const membership = await verifyCompanyMembership(String(user.id));
  const businessId = String((membership as any)?.business_id || '');
  if (!businessId) return null;
  return { user, businessId };
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await context(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const plan = String(body?.plan || 'monthly');
    if (!['monthly', 'quarterly', 'yearly'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid subscription plan.' }, { status: 400 });
    }
    if (body?.trial === true) {
      return NextResponse.json({ error: 'The ₹2 7-day trial has been removed. Please choose a paid plan.' }, { status: 410 });
    }

    const planId = RAZORPAY_PLAN_IDS[plan as keyof typeof RAZORPAY_PLAN_IDS];
    if (!planId) {
      return NextResponse.json({ error: `Razorpay plan ID for ${plan} is not configured.` }, { status: 503 });
    }

    const payload: Record<string, unknown> = {
      plan_id: planId,
      total_count: plan === 'monthly' ? 120 : plan === 'quarterly' ? 40 : 10,
      quantity: 1,
      customer_notify: false,
      notes: {
        business_id: ctx.businessId,
        user_id: ctx.user.id,
        plan,
        product: 'Billing Hub',
        user_email: ctx.user.email || '',
      },
    };

    const r = await razorpayRequest('subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json(
        { error: result?.error?.description || 'Unable to create Razorpay subscription.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      keyId: RAZORPAY_KEY_ID,
      subscriptionId: result.id,
      plan,
      trial: false,
      trialEndsAt: null,
      prefill: {
        name: ctx.user.user_metadata?.full_name || ctx.user.email?.split('@')[0] || '',
        email: ctx.user.email || '',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to start subscription.' }, { status: 500 });
  }
}
