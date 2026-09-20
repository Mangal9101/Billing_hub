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

    const planId = RAZORPAY_PLAN_IDS[plan as keyof typeof RAZORPAY_PLAN_IDS];
    if (!planId) {
      return NextResponse.json({ error: `Razorpay plan ID for ${plan} is not configured.` }, { status: 503 });
    }

    const trial = plan === 'monthly';

    // The ₹2 / 7-day trial is a one-time benefit per Billing Hub user.
    // This is stored in Supabase Auth user metadata, so clearing browser
    // storage or signing in again cannot reset the trial.
    if (trial) {
      const existing = await supabaseAdmin(
        `business_data?business_id=eq.${encodeURIComponent(ctx.businessId)}&select=payload&limit=1`
      );
      if (existing.ok) {
        const rows = await existing.json().catch(() => []);
        const trialUsedAt = rows?.[0]?.payload?.subscription?.trialUsedAt;
        if (trialUsedAt) {
          return NextResponse.json(
            { error: 'Your 7-day trial has already been used. Please choose a paid plan.' },
            { status: 409 },
          );
        }
      }
    }
    const payload: Record<string, unknown> = {
      plan_id: planId,
      total_count: plan === 'monthly' ? 120 : plan === 'quarterly' ? 40 : 10,
      quantity: 1,
      customer_notify: true,
      notes: {
        business_id: ctx.businessId,
        user_id: ctx.user.id,
        plan,
        product: 'Billing Hub',
      },
    };

    // Monthly: collect ₹2 upfront and start the ₹99 recurring plan after 7 days.
    // Razorpay Subscriptions supports trial periods and upfront charges.
    if (trial) {
      payload.start_at = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      payload.addons = [{
        item: {
          name: 'Billing Hub 7-Day Trial',
          amount: 200,
          currency: 'INR',
        },
      }];
    }

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
      trial,
      trialEndsAt: trial ? new Date((payload.start_at as number) * 1000).toISOString() : null,
      prefill: {
        name: ctx.user.user_metadata?.full_name || ctx.user.email?.split('@')[0] || '',
        email: ctx.user.email || '',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to start subscription.' }, { status: 500 });
  }
}
