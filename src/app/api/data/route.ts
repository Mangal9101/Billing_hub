import { NextRequest, NextResponse } from 'next/server';
import { defaultPermissions, type Permission } from '@/lib/permissions';
import {
  supabaseAdmin,
  supabaseAuthUser,
  verifyCompanyMembership,
  verifySpecificBusinessMembership,
} from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

function canEditSection(permissionList: Permission[], section: string, role: string) {
  if (role === 'owner') return true;
  const p = new Set(permissionList);
  const map: Record<string, Permission[]> = {
    business: ['settings_edit'],
    products: ['products_create', 'products_edit', 'products_delete'],
    customers: ['customers_create', 'customers_edit', 'customers_delete'],
    invoices: ['billing_create', 'billing_edit'],
    purchases: ['purchases_create', 'purchases_edit', 'purchases_delete'],
    movements: ['stock_edit'],
    ledger: ['khatabook_edit'],
  };
  return (map[section] || []).some((x) => p.has(x));
}

async function getContext(req: NextRequest, requestedBusinessId?: string) {
  const token = bearer(req);
  if (!token) return { error: 'Unauthorized', status: 401 as const };

  const user = await supabaseAuthUser(token);
  if (!user?.id) return { error: 'Unauthorized', status: 401 as const };

  const membership = requestedBusinessId
    ? await verifySpecificBusinessMembership(user.id, requestedBusinessId)
    : await verifyCompanyMembership(user.id);

  if (!membership) {
    return { error: 'You do not have access to this business.', status: 403 as const };
  }

  const role = String(membership.role || 'owner').toLowerCase();
  const permissions =
    Array.isArray(membership.permissions) && membership.permissions.length
      ? membership.permissions
      : defaultPermissions(role as any);

  return { user, membership, role, permissions };
}

export async function GET(req: NextRequest) {
  try {
    const requestedBusinessId = new URL(req.url).searchParams.get('businessId') || undefined;
    const context = await getContext(req, requestedBusinessId);
    if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

    const businessId = String(context.membership.business_id);
    const r = await supabaseAdmin(
      `business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload,updated_at&order=updated_at.desc&limit=1`
    );

    if (!r.ok) {
      return NextResponse.json({ error: await r.text() }, { status: 500 });
    }

    const rows = await r.json();
    let payload = rows?.[0]?.payload || null;
    if (payload && context.role === 'owner') {
      const storedOwnerName = String(payload.business?.ownerName || '').trim();
      const resolvedOwnerName =
        context.user.user_metadata?.full_name?.trim?.() ||
        context.user.user_metadata?.name?.trim?.() ||
        context.user.user_metadata?.display_name?.trim?.() ||
        storedOwnerName ||
        context.user.email?.split('@')[0] ||
        'Owner';

      payload = {
        ...payload,
        business: {
          ...(payload.business || {}),
          id: businessId,
          ownerUserId: context.user.id,
          ownerName: resolvedOwnerName,
          ownerEmail: context.user.email || '',
        },
      };
    }
    return NextResponse.json({
      payload,
      updatedAt: rows?.[0]?.updated_at || null,
      companyId: businessId,
      role: context.role,
      permissions: context.permissions,
      ownerId: context.user.id,
      ownerEmail: context.user.email || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to load data.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedBusinessId = String(body?.businessId || '').trim() || undefined;
    const context = await getContext(req, requestedBusinessId);
    if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

    const incoming = body?.payload;
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ error: 'Payload required.' }, { status: 400 });
    }

    const businessId = String(context.membership.business_id);
    const role = context.role;
    const permissions = context.permissions as Permission[];

    const oldR = await supabaseAdmin(
      `business_data?business_id=eq.${encodeURIComponent(businessId)}&select=payload&order=updated_at.desc&limit=1`
    );
    if (!oldR.ok) return NextResponse.json({ error: await oldR.text() }, { status: 500 });
    const oldRows = await oldR.json();
    const old = oldRows?.[0]?.payload || null;

    // Reject an older browser snapshot so multiple open tabs/components cannot
    // make the data bounce between old/new values after refresh.
    const incomingCloudUpdatedAt = Number(incoming?._cloudUpdatedAt || 0);
    const storedCloudUpdatedAt = Number(old?._cloudUpdatedAt || 0);
    if (old && incomingCloudUpdatedAt > 0 && storedCloudUpdatedAt > 0 && incomingCloudUpdatedAt < storedCloudUpdatedAt) {
      return NextResponse.json({ ok: false, stale: true, error: 'Stale data snapshot ignored.' }, { status: 409 });
    }

    // Never allow the browser to move the payload to another business.
    incoming.business = {
      ...(incoming.business || {}),
      id: businessId,
    };

    if (old && role !== 'owner') {
      const protectedSections = [
        'business',
        'products',
        'customers',
        'invoices',
        'purchases',
        'movements',
        'ledger',
      ];

      for (const section of protectedSections) {
        if (
          JSON.stringify(old[section] ?? null) !== JSON.stringify(incoming[section] ?? null) &&
          !canEditSection(permissions, section, role)
        ) {
          return NextResponse.json(
            { error: `You do not have permission to modify ${section}.` },
            { status: 403 }
          );
        }
      }

      if (!canEditSection(permissions, 'business', role)) {
        incoming.business = old.business;
      }
    }

    // Owner identity is server-controlled. Business contact details remain editable.
    if (role === 'owner') {
      const storedOwnerName = String(old?.business?.ownerName || '').trim();
      const resolvedOwnerName =
        context.user.user_metadata?.full_name?.trim?.() ||
        context.user.user_metadata?.name?.trim?.() ||
        context.user.user_metadata?.display_name?.trim?.() ||
        storedOwnerName ||
        context.user.email?.split('@')[0] ||
        'Owner';

      incoming.business = {
        ...incoming.business,
        ownerUserId: context.user.id,
        ownerName: resolvedOwnerName,
        ownerEmail: context.user.email || '',
      };
    } else if (old?.business) {
      incoming.business = {
        ...incoming.business,
        ownerUserId: old.business.ownerUserId,
        ownerName: old.business.ownerName,
        ownerEmail: old.business.ownerEmail,
      };
    }

    if (old) {
      await supabaseAdmin('business_backups', {
        method: 'POST',
        body: JSON.stringify({
          business_id: businessId,
          payload: old,
          created_by: context.user.id,
          reason: body.reason || 'Automatic backup before change',
        }),
      });

      await supabaseAdmin('audit_logs', {
        method: 'POST',
        body: JSON.stringify({
          business_id: businessId,
          actor_id: context.user.id,
          action: body.action || 'DATA_UPDATE',
          summary: body.summary || 'Business data changed',
          before_payload: old,
          after_payload: incoming,
        }),
      });
    }

    const now = new Date().toISOString();

    // Update the existing business row instead of inserting another snapshot.
    // This prevents GET from alternating between old/new duplicate rows.
    let save = await supabaseAdmin(
      `business_data?business_id=eq.${encodeURIComponent(businessId)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          payload: incoming,
          updated_at: now,
        }),
      }
    );

    if (save.ok) {
      const patchedRows = await save.json().catch(() => []);
      // If no row existed yet, create the first one.
      if (!Array.isArray(patchedRows) || patchedRows.length === 0) {
        save = await supabaseAdmin('business_data', {
          method: 'POST',
          body: JSON.stringify({
            business_id: businessId,
            payload: incoming,
            updated_at: now,
          }),
        });
      }
    }

    if (!save.ok) {
      return NextResponse.json({ error: await save.text() }, { status: 500 });
    }

    // Keep the business selector's name/logo in sync with Settings.
    if (role === 'owner' && incoming.business) {
      await supabaseAdmin(`businesses?id=eq.${encodeURIComponent(businessId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(incoming.business.name || 'My Business').trim() || 'My Business',
          logo_url: incoming.business.logoUrl || null,
        }),
      });
    }

    return NextResponse.json({ ok: true, backedUp: !!old, companyId: businessId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unable to save data.' }, { status: 500 });
  }
}
