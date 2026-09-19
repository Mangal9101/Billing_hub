import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server-supabase';
import { verifyWebhookSignature } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

async function saveByBusinessId(businessId: string, patch: Record<string, unknown>) {
  if (!businessId) return;
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
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  try {
    const event = JSON.parse(raw);
    const entity =
      event?.payload?.subscription?.entity ||
      event?.payload?.payment?.entity ||
      event?.payload?.order?.entity ||
      {};
    const businessId = String(entity?.notes?.business_id || '');
    const eventName = String(event?.event || '');

    if (businessId) {
      if (eventName === 'subscription.charged') {
        await saveByBusinessId(businessId, {
          status: 'active',
          plan: String(entity?.notes?.plan || 'monthly'),
          razorpaySubscriptionId: entity?.id || null,
          lastPaymentId: entity?.payment_id || null,
          lastEvent: eventName,
        });
      } else if (eventName === 'subscription.cancelled' || eventName === 'subscription.completed') {
        await saveByBusinessId(businessId, {
          status: 'cancelled',
          razorpaySubscriptionId: entity?.id || null,
          lastEvent: eventName,
        });
      } else if (eventName === 'subscription.halted') {
        await saveByBusinessId(businessId, {
          status: 'past_due',
          razorpaySubscriptionId: entity?.id || null,
          lastEvent: eventName,
        });
      } else if (eventName === 'payment.failed') {
        await saveByBusinessId(businessId, {
          status: 'past_due',
          lastPaymentId: entity?.id || null,
          lastEvent: eventName,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Webhook processing failed.' }, { status: 500 });
  }
}
