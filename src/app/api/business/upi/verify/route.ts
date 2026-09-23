import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import {
  supabaseAuthUserWithRefresh,
  verifyCompanyMembership,
  verifyBusinessOwner,
} from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function razorpayAuth() {
  const key = process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  return {
    key,
    secret,
    header: key && secret ? `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` : '',
  };
}

async function getAuthorizedUser(req: NextRequest) {
  const serverSession = await getServerSession();
  if (serverSession) {
    return {
      uid: serverSession.uid,
      email: serverSession.email,
      companyId: serverSession.companyId,
      role: serverSession.role,
    };
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\\s+/i, '').trim();
  const refreshToken = (req.headers.get('x-refresh-token') || '').trim();
  if (!token) throw new Error('Your session has expired. Please sign in again.');

  const auth = await supabaseAuthUserWithRefresh(token, refreshToken);
  if (!auth.user?.id) throw new Error('Invalid authentication session. Please sign in again.');

  const membership = await verifyCompanyMembership(String(auth.user.id));
  if (!membership?.business_id) throw new Error('Business membership not found.');

  return {
    uid: String(auth.user.id),
    email: String(auth.user.email || ''),
    companyId: String(membership.business_id),
    role: String(membership.role || '').toLowerCase(),
  };
}

async function razorpayFetch(path: string, init: RequestInit = {}) {
  const { header } = razorpayAuth();
  if (!header) throw new Error('RazorpayX account validation is not configured.');

  return fetch(`https://api.razorpay.com${path}`, {
    ...init,
    headers: {
      Authorization: header,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const upiId = String(body?.upiId || '').trim().toLowerCase();

    if (!upiId || !upiId.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid UPI ID.' }, { status: 400 });
    }

    const auth = await getAuthorizedUser(req);
    const membership = await verifyCompanyMembership(auth.uid);
    if (!membership?.business_id) {
      return NextResponse.json({ error: 'Business membership not found.' }, { status: 403 });
    }

    const businessId = String(membership.business_id);
    const role = auth.role || String(membership.role || '').toLowerCase();
    if (auth.companyId && auth.companyId !== businessId) {
      return NextResponse.json({ error: 'Business session mismatch.' }, { status: 403 });
    }

    if (role === 'owner' && !(await verifyBusinessOwner(auth.uid, businessId))) {
      return NextResponse.json({ error: 'Only the business owner can verify this UPI ID.' }, { status: 403 });
    }

    const sourceAccountNumber = process.env.RAZORPAYX_SOURCE_ACCOUNT_NUMBER || '';
    if (!sourceAccountNumber) {
      return NextResponse.json({
        error: 'UPI bank-name verification is not configured yet. Add RAZORPAYX_SOURCE_ACCOUNT_NUMBER in Vercel.',
      }, { status: 500 });
    }

    const referenceId = `BH-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const createResponse = await razorpayFetch('/v1/fund_accounts/validations', {
      method: 'POST',
      body: JSON.stringify({
        source_account_number: sourceAccountNumber,
        reference_id: referenceId,
        notes: {
          source: 'billing_hub',
          business_id: businessId,
          upi_id: upiId,
        },
        fund_account: {
          account_type: 'vpa',
          vpa: { address: upiId },
          contact: {
            name: 'Billing Hub Business',
            email: auth.email || 'support@billinghub.in',
            contact: '9999999999',
            type: 'employee',
            reference_id: referenceId,
          },
        },
      }),
    });

    const created = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) {
      const detail = String(created?.error?.description || created?.error?.reason || created?.message || '');
      return NextResponse.json({
        error: detail || 'Razorpay could not start UPI verification.',
      }, { status: createResponse.status >= 400 && createResponse.status < 500 ? createResponse.status : 502 });
    }

    const validationId = String(created?.id || '');
    if (!validationId) {
      return NextResponse.json({ error: 'Razorpay did not return a verification ID.' }, { status: 502 });
    }

    // VPA validation can initially return "created". Poll briefly so the
    // Settings screen receives the bank-registered name in the same click.
    let latest = created;
    for (let i = 0; i < 8; i += 1) {
      const status = String(latest?.status || '').toLowerCase();
      const registeredName = String(latest?.validation_results?.registered_name || '').trim();
      if (status === 'completed' || registeredName) break;
      if (status === 'failed') break;

      await new Promise(resolve => setTimeout(resolve, 1500));
      const poll = await razorpayFetch(`/v1/fund_accounts/validations/${encodeURIComponent(validationId)}`, { method: 'GET' });
      latest = await poll.json().catch(() => latest);
      if (!poll.ok) break;
    }

    const status = String(latest?.status || '').toLowerCase();
    const registeredName = String(latest?.validation_results?.registered_name || '').trim();
    const accountStatus = String(latest?.validation_results?.account_status || '').trim();

    if (status === 'failed' || accountStatus === 'invalid' || !registeredName) {
      const detail = String(
        latest?.validation_results?.details ||
        latest?.status_details?.description ||
        latest?.status_details?.reason ||
        ''
      );
      return NextResponse.json({
        error: detail || 'This UPI ID could not be verified or its bank-registered name was not returned.',
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      upiId,
      registeredName,
      accountStatus: accountStatus || 'active',
      validationId,
    });
  } catch (e: any) {
    console.error('UPI BANK NAME VERIFY ERROR:', e);
    return NextResponse.json({
      error: e?.message || 'Unable to verify UPI ID.',
    }, { status: 500 });
  }
}
