import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAuthUser, verifyCompanyMembership, verifyBusinessOwner } from '@/lib/server-supabase';
import { RAZORPAY_KEY_ID, RAZORPAY_PLAN_IDS, razorpayRequest } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\\s+/i, '').trim();
}

async function context(req: NextRequest) {
  const token = bearer(req);
  const user = await supabaseAuthUser(token);
  if (!user?.id) return null;
  const membership = await verifyCompanyMembership(user.id);
  if (!membership) return null;
  const businessId = String(membership.business_id);
  const isOwner = String(membership.role || '').toLowerCase() === 'owner' || await verifyBusinessOwner(user.id, businessId);
  if (!isOwner) return null;
  return { user, businessId };
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await context(req);
    if (!ctx) return NextResponse.json({ error: 'Owner access required.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const plan = String(body?.plan || 'monthly');
    const planId = RAZORPAY_PLAN_IDS[plan as keyof typeof RAZORPAY_PLAN_IDS];

    if (!planId) {
      return NextResponse.json({ error: `Razorpay plan ID for ${plan} is not configured.` }, { status: 503 });
    }

    const trial = plan === 'monthly' && body?.trial !== false;
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
    if (!r.ok) return NextResponse.json({ error: result?.error?.description || 'Unable to create Razorpay subscription.' }, { status: 502 });

    return NextResponse.json({
      keyId: RAZORPAY_KEY_ID,
      subscriptionId: result.id,
      plan,
      trial,
      shortUrl: result.short_url || null,
      prefill: {
        name: ctx.user.user_metadata?.full_name || ctx.user.email?.split('@')[0] || '',
        email: ctx.user.email || '',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to start subscription.' }, { status: 500 });
  }
}
