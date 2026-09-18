import { NextRequest, NextResponse } from 'next/server';
import { defaultPermissions, sanitizeStaffPermissions } from '@/lib/permissions';
import { supabaseAdmin, supabaseAuthUser, verifySpecificBusinessMembership } from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

async function ownerContext(req: NextRequest, bodyBusinessId?: string) {
  const token = bearer(req);
  const user = await supabaseAuthUser(token);
  if (!user?.id) throw new Error('Unauthorized');

  const requested = bodyBusinessId || new URL(req.url).searchParams.get('businessId') || '';
  if (!requested) throw new Error('Business ID required');

  const membership = await verifySpecificBusinessMembership(user.id, requested);
  if (!membership || String(membership.role).toLowerCase() !== 'owner') throw new Error('Owner permission required');
  return { user, membership };
}

export async function GET(req: NextRequest) {
  try {
    const { membership } = await ownerContext(req);
    const r = await supabaseAdmin(`staff_profiles?business_id=eq.${encodeURIComponent(membership.business_id)}&select=id,user_id,name,phone,email,role,salary,join_date,status,login_id,permissions,created_at&order=created_at.asc`);
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
    const staff = await r.json();
    return NextResponse.json({ staff: Array.isArray(staff) ? staff.map((s:any) => ({
      ...s,
      loginId: String(s.login_id || ''),
      joinDate: String(s.join_date || ''),
      permissions: sanitizeStaffPermissions(String(s.role || 'cashier').toLowerCase() as any, s.permissions),
    })) : [] });
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'Unable to load staff.' }, { status: e?.message === 'Unauthorized' ? 401 : 403 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { membership } = await ownerContext(req, String(body.businessId || ''));
    const loginId = String(body.loginId || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = String(body.role || 'cashier').toLowerCase();
    if (!loginId || password.length < 6) return NextResponse.json({ error: 'Login ID and a 6+ character password are required.' }, { status: 400 });
    if (!['manager','cashier','helper'].includes(role)) return NextResponse.json({ error: 'Invalid staff role.' }, { status: 400 });

    // Prevent ambiguous staff login IDs across businesses.
    const duplicate = await supabaseAdmin(`staff_profiles?login_id=eq.${encodeURIComponent(loginId)}&select=id&limit=1`);
    if (!duplicate.ok) return NextResponse.json({ error: await duplicate.text() }, { status: 500 });
    if ((await duplicate.json())?.length) return NextResponse.json({ error: 'This Staff Login ID is already in use. Choose a unique Login ID.' }, { status: 409 });

    const email = `staff.${loginId}.${membership.business_id.replace(/[^a-z0-9]/gi,'').slice(-18)}@staff.sawariya.app`;
    const created = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { staff_login_id: loginId, staff_name: body.name, company_id: membership.business_id, role } }),
    });
    const authUser = await created.json();
    if (!created.ok) return NextResponse.json({ error: authUser?.msg || authUser?.message || 'Unable to create staff account.' }, { status: 400 });

    const perms = sanitizeStaffPermissions(role as any, body.permissions);
    const row = {
      id: `staff-${authUser.id}`, user_id: authUser.id, business_id: membership.business_id,
      name: body.name, phone: body.phone || '', email: body.email || '', role,
      salary: Number(body.salary || 0), join_date: body.joinDate || new Date().toLocaleDateString('en-GB'),
      status: body.status || 'Active', login_id: loginId, permissions: perms.length ? perms : defaultPermissions(role as any),
    };
    const saved = await supabaseAdmin('staff_profiles', { method: 'POST', body: JSON.stringify(row) });
    if (!saved.ok) return NextResponse.json({ error: await saved.text() }, { status: 500 });

    // Every staff account also gets a business membership. The data API
    // authorizes access through this membership, so staff can never fall back
    // to another business or the owner's account.
    const member = await supabaseAdmin('business_members', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        business_id: membership.business_id,
        user_id: authUser.id,
        role,
        permissions: row.permissions,
      }),
    });
    if (!member.ok) {
      await supabaseAdmin(`staff_profiles?id=eq.${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, { method: 'DELETE', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` } });
      return NextResponse.json({ error: `Unable to create staff business membership: ${await member.text()}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, staff: { ...row, password: undefined } });
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'Unable to create staff.' }, { status: e?.message === 'Unauthorized' ? 401 : 403 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { membership } = await ownerContext(req);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Staff id required.' }, { status: 400 });
    const found = await supabaseAdmin(`staff_profiles?id=eq.${encodeURIComponent(id)}&business_id=eq.${encodeURIComponent(membership.business_id)}&select=user_id&limit=1`);
    if (!found.ok) return NextResponse.json({ error: await found.text() }, { status: 500 });
    const rows = await found.json();
    if (!rows?.[0]) return NextResponse.json({ error: 'Staff not found.' }, { status: 404 });
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${rows[0].user_id}`, { method: 'DELETE', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` } });
    await supabaseAdmin(`staff_profiles?id=eq.${encodeURIComponent(id)}&business_id=eq.${encodeURIComponent(membership.business_id)}`, { method: 'DELETE' });
    await supabaseAdmin(`business_members?business_id=eq.${encodeURIComponent(membership.business_id)}&user_id=eq.${encodeURIComponent(rows[0].user_id)}`, { method: 'DELETE' });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'Unable to delete staff.' }, { status: e?.message === 'Unauthorized' ? 401 : 403 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { membership } = await ownerContext(req, String(body.businessId || ''));
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error:'Staff id required.' }, { status:400 });

    const patch:any = {};
    for (const k of ['name','phone','email','role','salary','join_date','status','login_id']) if (body[k] !== undefined) patch[k] = body[k];
    if (body.permissions !== undefined) {
      const role = String(body.role || 'cashier').toLowerCase() as any;
      patch.permissions = sanitizeStaffPermissions(role, body.permissions);
    }

    const found = await supabaseAdmin(`staff_profiles?id=eq.${encodeURIComponent(id)}&business_id=eq.${encodeURIComponent(membership.business_id)}&select=user_id,role&limit=1`);
    if (!found.ok) return NextResponse.json({ error: await found.text() }, { status:500 });
    const rows=await found.json();
    if(!rows?.[0]) return NextResponse.json({error:'Staff not found.'},{status:404});

    if (patch.login_id) {
      const duplicate = await supabaseAdmin(`staff_profiles?login_id=eq.${encodeURIComponent(String(patch.login_id).toLowerCase())}&id=neq.${encodeURIComponent(id)}&select=id&limit=1`);
      if (!duplicate.ok) return NextResponse.json({ error: await duplicate.text() }, { status: 500 });
      if ((await duplicate.json())?.length) return NextResponse.json({ error:'This Staff Login ID is already in use.' }, { status:409 });
      patch.login_id = String(patch.login_id).toLowerCase();
    }

    const saved=await supabaseAdmin(`staff_profiles?id=eq.${encodeURIComponent(id)}&business_id=eq.${encodeURIComponent(membership.business_id)}`,{method:'PATCH',body:JSON.stringify(patch)});
    if(!saved.ok)return NextResponse.json({error:await saved.text()},{status:500});

    const effectiveRole = String(patch.role || rows[0].role || 'cashier').toLowerCase() as any;
    const effectivePermissions = patch.permissions || sanitizeStaffPermissions(effectiveRole, undefined);
    const memberUpdate = await supabaseAdmin(`business_members?business_id=eq.${encodeURIComponent(membership.business_id)}&user_id=eq.${encodeURIComponent(rows[0].user_id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: effectiveRole, permissions: effectivePermissions }),
    });
    if(!memberUpdate.ok)return NextResponse.json({error:await memberUpdate.text()},{status:500});
    return NextResponse.json({ok:true});
  } catch(e:any){return NextResponse.json({error:e?.message||'Unable to update staff.'},{status:e?.message==='Unauthorized'?401:403});}
}
