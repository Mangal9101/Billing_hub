import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAuthUser, verifyCompanyMembership } from '@/lib/server-supabase';
import { razorpayRequest } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

async function loadSubscription(businessId: string) {
  const r = await supabaseAdmin(
    `business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload&limit=1`
  );
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json().catch(() => []);
  return rows?.[0]?.payload?.subscription || null;
}

async function saveSubscription(businessId: string, patch: Record<string, unknown>) {
  const r = await supabaseAdmin(
    `business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload&limit=1`
  );
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

  const response = await supabaseAdmin(
    `business_data?business_id=eq.${encodeURIComponent(businessId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        payload: next,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return next.subscription;
}

export async function POST(req: NextRequest) {
  try {
    const user = await supabaseAuthUser(bearer(req));
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const membership = await verifyCompanyMembership(user.id);
    const businessId = String((membership as any)?.business_id || '');
    if (!businessId) return NextResponse.json({ error: 'Business access required.' }, { status: 403 });

    const current = await loadSubscription(businessId);
    if (!current?.razorpaySubscriptionId) {
      return NextResponse.json({ error: 'No active AutoPay subscription found.' }, { status: 404 });
    }

    const subscriptionId = String(current.razorpaySubscriptionId);
    const isTrial = current.isTrial === true;

    // Trial: cancel immediately.
    // Paid plan: stop the next renewal but preserve access until the paid
    // billing cycle ends.
    const scheduleChangeAt = isTrial ? 'now' : 'cycle_end';

    const r = await razorpayRequest(`subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ schedule_change_at: scheduleChangeAt }),
    });
    const result = await r.json().catch(() => ({}));

    if (!r.ok) {
      return NextResponse.json(
        { error: result?.error?.description || 'Unable to cancel AutoPay.' },
        { status: 502 }
      );
    }

    const currentPeriodEndsAt =
      result?.current_end
        ? new Date(Number(result.current_end) * 1000).toISOString()
        : current?.currentPeriodEndsAt || null;

    const saved = await saveSubscription(businessId, isTrial
      ? {
          status: 'cancelled',
          isTrial: true,
          autoPayCancelled: true,
          cancelledAt: new Date().toISOString(),
          trialEndsAt: new Date().toISOString(),
          currentPeriodEndsAt: null,
          razorpaySubscriptionId: subscriptionId,
          lastEvent: 'subscription.cancelled',
        }
      : {
          status: 'active',
          isTrial: false,
          autoPayCancelled: true,
          cancelledAt: new Date().toISOString(),
          currentPeriodEndsAt,
          razorpaySubscriptionId: subscriptionId,
          lastEvent: 'subscription.cancelled',
        });

    return NextResponse.json({
      ok: true,
      subscription: saved,
      accessUntil: isTrial ? null : currentPeriodEndsAt,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unable to cancel AutoPay.' },
      { status: 500 }
    );
  }
}
