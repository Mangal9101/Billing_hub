import { NextRequest, NextResponse } from 'next/server';
import { defaultPermissions } from '@/lib/permissions';
import {
  getOwnerBusinessId,
  hashDevice,
  supabaseAdmin,
  supabaseAuthUser,
  verifyCompanyMembership,
} from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function ownerName(user: any) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Owner'
  );
}

function ownerEmail(user: any) {
  return String(user?.email || '').trim().toLowerCase();
}

async function storedOwnerName(businessId: string) {
  try {
    const response = await supabaseAdmin(
      `business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload&limit=1`
    );
    if (!response.ok) return '';
    const rows = await response.json();
    const value = rows?.[0]?.payload?.business?.ownerName;
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

function bestOwnerName(user: any, storedName?: string) {
  return (
    user?.user_metadata?.full_name?.trim?.() ||
    user?.user_metadata?.name?.trim?.() ||
    user?.user_metadata?.display_name?.trim?.() ||
    storedName?.trim?.() ||
    user?.email?.split('@')[0] ||
    'Owner'
  );
}

async function ensureOwnerBusiness(user: any) {
  const userId = String(user.id);
  const email = ownerEmail(user);
  const name = ownerName(user);
  const businessId = getOwnerBusinessId(userId);
  const businessName = `${name}'s Business`;

  // These writes are independent, so run them together instead of paying
  // for two sequential Supabase round trips during first-time Google login.
  const [business, membership] = await Promise.all([
    supabaseAdmin('businesses', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: businessId,
        name: businessName,
        owner_id: userId,
      }),
    }),
    supabaseAdmin('business_members', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        business_id: businessId,
        user_id: userId,
        role: 'owner',
        permissions: defaultPermissions('owner'),
      }),
    }),
  ]);
  if (!business.ok) {
    throw new Error(`Unable to create business: ${await business.text()}`);
  }
  if (!membership.ok) {
    throw new Error(`Unable to create business membership: ${await membership.text()}`);
  }

  const existingData = await supabaseAdmin(
    `business_data?business_id=eq.${encodeURIComponent(businessId)}&select=business_id&limit=1`
  );
  if (!existingData.ok) {
    throw new Error(`Unable to check business data: ${await existingData.text()}`);
  }

  const rows = await existingData.json();
  if (!Array.isArray(rows) || !rows.length) {
    const data = await supabaseAdmin('business_data', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        business_id: businessId,
        payload: {
          business: {
            id: businessId,
            name: businessName,
            ownerUserId: userId,
            ownerName: name,
            ownerEmail: email,
          },
          products: [],
          customers: [],
          invoices: [],
          ledger: [],
          purchases: [],
          movements: [],
          activity: { invoice: 0, products: 0, khatabook: 0 },
          notifications: [],
        },
        updated_at: new Date().toISOString(),
      }),
    });
    if (!data.ok) {
      throw new Error(`Unable to create business data: ${await data.text()}`);
    }
  }

  return { businessId, name, email };
}

async function trustedDevice(userId: string, deviceId: string) {
  const deviceHash = hashDevice(deviceId);
  const response = await supabaseAdmin(
    `trusted_devices?user_id=eq.${encodeURIComponent(userId)}&device_hash=eq.${encodeURIComponent(deviceHash)}&select=id&limit=1`
  );
  if (!response.ok) throw new Error(`Unable to verify trusted device: ${await response.text()}`);
  const rows = await response.json();
  return { trusted: Array.isArray(rows) && rows.length > 0, deviceHash };
}

async function trustDevice(userId: string, deviceHash: string) {
  const response = await supabaseAdmin('trusted_devices', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      device_hash: deviceHash,
      verified_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Unable to save trusted device: ${await response.text()}`);
}

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const body = await req.json().catch(() => ({}));
    const deviceId = String(body?.deviceId || '').trim();
    const otpVerified = body?.otpVerified === true;

    if (!token || !deviceId) {
      return NextResponse.json({ error: 'Authentication and device ID are required.' }, { status: 401 });
    }

    // Never trust uid/email/companyId from the browser.
    const user = await supabaseAuthUser(token);
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: 'Invalid authentication session.' }, { status: 401 });
    }

    const uid = String(user.id);
    const email = ownerEmail(user);
    const name = ownerName(user);
    const membership = await verifyCompanyMembership(uid);

    if (membership) {
      const companyId = String(membership.business_id || '');
      if (!companyId) {
        return NextResponse.json({ error: 'Your account has an invalid business membership.' }, { status: 403 });
      }

      const role = String(membership.role || 'owner').toLowerCase();

      // These checks do not depend on one another. Run them concurrently so
      // Google callback completion is limited by the slowest Supabase request,
      // rather than the sum of several network round trips.
      const [device, businessRows] = await Promise.all([
        trustedDevice(uid, deviceId),
        role === 'owner'
          ? supabaseAdmin(
              `businesses?id=eq.${encodeURIComponent(companyId)}&select=id,owner_id&limit=1`
            ).then(async (response) => {
              if (!response.ok) throw new Error(`Unable to verify business owner: ${await response.text()}`);
              return response.json();
            })
          : Promise.resolve([]),
      ]);
      const resolvedName = bestOwnerName(user);

      // Repair the old shared-owner edge case: an owner membership is valid only
      // when the business itself is owned by the same Supabase Auth user.
      if (role === 'owner') {
        const businessOwnerId = businessRows?.[0]?.owner_id;
        if (businessOwnerId && String(businessOwnerId) !== uid) {
          await supabaseAdmin(
            `business_members?business_id=eq.${encodeURIComponent(companyId)}&user_id=eq.${encodeURIComponent(uid)}`,
            { method: 'DELETE' }
          );
          const privateBusiness = await ensureOwnerBusiness(user);
          if (!otpVerified) {
            return NextResponse.json({ needsEmailOtp: true, firstLogin: true, uid, email: privateBusiness.email, name: privateBusiness.name, companyId: privateBusiness.businessId });
          }
          const privateDevice = await trustedDevice(uid, deviceId);
          if (!privateDevice.trusted) await trustDevice(uid, privateDevice.deviceHash);
          return NextResponse.json({ ok:true, uid, email:privateBusiness.email, name:privateBusiness.name, companyId:privateBusiness.businessId, role:'owner', permissions:defaultPermissions('owner'), isOwner:true, firstLogin:true });
        }
      }

      const permissions =
        Array.isArray(membership.permissions) && membership.permissions.length
          ? membership.permissions
          : defaultPermissions(role as any);

      if (!device.trusted && !otpVerified) {
        return NextResponse.json({
          needsEmailOtp: true,
          firstLogin: false,
          uid,
          email,
          name: resolvedName,
          companyId,
        });
      }

      if (!device.trusted && otpVerified) {
        await trustDevice(uid, device.deviceHash);
      }

      return NextResponse.json({
        ok: true,
        uid,
        email,
        name: resolvedName,
        companyId,
        role,
        permissions,
        isOwner: role === 'owner',
      });
    }

    // New owner: keep the Google -> OTP transition fast. Business creation is
    // only needed after the OTP has actually been verified.
    const businessId = getOwnerBusinessId(uid);
    const ownerNameValue = ownerName(user);
    if (!otpVerified) {
      return NextResponse.json({
        needsEmailOtp: true,
        firstLogin: true,
        uid,
        email,
        name: ownerNameValue,
        companyId: businessId,
      });
    }

    const business = await ensureOwnerBusiness(user);
    const device = await trustedDevice(uid, deviceId);
    if (!device.trusted) await trustDevice(uid, device.deviceHash);

    return NextResponse.json({
      ok: true,
      uid,
      email: business.email,
      name: business.name,
      companyId: business.businessId,
      role: 'owner',
      permissions: defaultPermissions('owner'),
      isOwner: true,
      firstLogin: true,
    });
  } catch (e: any) {
    console.error('AUTH COMPLETE ERROR:', e);
    return NextResponse.json(
      { error: e?.message || 'Unable to complete sign in.' },
      { status: 500 }
    );
  }
}
