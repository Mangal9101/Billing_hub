import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAuthUser, verifyCompanyMembership, getOwnerBusiness } from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\\s+/i, '').trim();
}

export async function GET(req: NextRequest) {
  try {
    const user = await supabaseAuthUser(bearer(req));
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const membership = await verifyCompanyMembership(user.id);
  const ownedBusiness = await getOwnerBusiness(user.id);
  const business = ownedBusiness || membership;
    if (!business) return NextResponse.json({ error: 'Business access required.' }, { status: 403 });
    const businessId = String((business as any).business_id || (business as any).id);
    const r = await supabaseAdmin(`business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload&limit=1`);
    const rows = await r.json().catch(() => []);
    return NextResponse.json({ subscription: rows?.[0]?.payload?.subscription || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to load subscription status.' }, { status: 500 });
  }
}
