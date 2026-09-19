import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthUser, verifyCompanyMembership, getOwnerBusiness, supabaseAdmin } from '@/lib/server-supabase';
import { RAZORPAY_KEY_ID, razorpayRequest } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\\s+/i, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const token = bearer(req);
    const user = await supabaseAuthUser(token);
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const membership = await verifyCompanyMembership(user.id);
  const ownedBusiness = await getOwnerBusiness(user.id);
  const business = ownedBusiness || membership;
    if (!business) return NextResponse.json({ error: 'Business access required.' }, { status: 403 });
    const businessId = String((business as any).business_id || (business as any).id);

    const body = await req.json().catch(() => ({}));
    if (body?.plan !== 'lifetime') return NextResponse.json({ error: 'Invalid one-time plan.' }, { status: 400 });

    const r = await razorpayRequest('orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: 249900,
        currency: 'INR',
        receipt: `bh_lifetime_${Date.now()}`,
        notes: {
          business_id: businessId,
          user_id: user.id,
          plan: 'lifetime',
          product: 'Billing Hub',
        },
      }),
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok) return NextResponse.json({ error: result?.error?.description || 'Unable to create payment order.' }, { status: 502 });

    return NextResponse.json({
      keyId: RAZORPAY_KEY_ID,
      orderId: result.id,
      amount: result.amount,
      currency: result.currency,
      prefill: {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        email: user.email || '',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to start payment.' }, { status: 500 });
  }
}
