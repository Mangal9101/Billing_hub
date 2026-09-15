import { NextRequest, NextResponse } from 'next/server';
import { createServiceAccountAccessToken, supabaseAdmin, supabaseAuthUser, verifyCompanyMembership, verifySpecificBusinessMembership } from '@/lib/server-supabase';

export const dynamic = 'force-dynamic';

const rowsFor = (title: string, payload: any) => {
  const common = (rows: any[], keys: string[]) => [keys, ...rows.map(r => keys.map(k => r?.[k] ?? ''))];
  if (title === 'Products') return common(payload.products || [], ['id','name','sku','category','price','stock','unit','lowStockAlert']);
  if (title === 'Customers') return common(payload.customers || [], ['id','name','phone','address','totalPurchases','outstanding','lastVisit']);
  if (title === 'Invoices') return common(payload.invoices || [], ['id','customer','phone','total','paid','due','mode','status','date','time']);
  if (title === 'Payments') return common((payload.ledger || []).filter((x:any)=>Number(x.credit)>0), ['id','customerId','description','credit','date','invoiceId']);
  if (title === 'Staff') return common(payload.staff || [], ['id','name','phone','email','role','status','loginId']);
  return common(payload.auditLogs || [], ['id','action','summary','actor_id','created_at']);
};

async function googleApi(token:string, path:string, init:RequestInit={}) {
  const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${token}`); headers.set('Content-Type','application/json');
  const r = await fetch(`https://sheets.googleapis.com/v4/${path}`, {...init, headers});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function driveApi(token:string, path:string, init:RequestInit={}) {
  const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${token}`); headers.set('Content-Type','application/json');
  const r = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {...init, headers});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function POST(req: NextRequest) {
  try {
    const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const user = await supabaseAuthUser(auth);
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const requestedBusinessId = String(body?.businessId || '').trim();
    const membership = requestedBusinessId ? await verifySpecificBusinessMembership(user.id, requestedBusinessId) : await verifyCompanyMembership(user.id);
    if (!membership) return NextResponse.json({ error: 'No access to this business.' }, { status: 403 });
    const payload = body.payload;
    if (!payload) return NextResponse.json({ error: 'Payload required.' }, { status: 400 });
    const staffR = await supabaseAdmin(`staff_profiles?business_id=eq.${encodeURIComponent(membership.business_id)}&select=id,name,phone,email,role,status,login_id`);
    const auditR = await supabaseAdmin(`audit_logs?business_id=eq.${encodeURIComponent(membership.business_id)}&select=id,action,summary,actor_id,created_at&order=created_at.desc&limit=5000`);
    payload.staff = (await staffR.json()).map((x:any)=>({...x,loginId:x.login_id}));
    payload.auditLogs = await auditR.json();
    const token = await createServiceAccountAccessToken();

    const bizR = await supabaseAdmin(`businesses?id=eq.${encodeURIComponent(membership.business_id)}&select=id,name,sheet_id&limit=1`);
    const bizRows = await bizR.json();
    const biz = bizRows?.[0];
    if (!biz) return NextResponse.json({ error: 'Business not found.' }, { status: 404 });

    let spreadsheetId = biz.sheet_id;
    if (!spreadsheetId) {
      const created = await googleApi(token, 'spreadsheets', { method: 'POST', body: JSON.stringify({ properties: { title: `${biz.name} — Billing Hub Data` }, sheets: ['Products','Customers','Invoices','Payments','Staff','Change Log'].map(title => ({ properties: { title } })) }) });
      spreadsheetId = created.spreadsheetId;
      await supabaseAdmin(`businesses?id=eq.${encodeURIComponent(biz.id)}`, { method:'PATCH', body:JSON.stringify({sheet_id:spreadsheetId}) });
      if (user.email) {
        try { await driveApi(token, `files/${spreadsheetId}/permissions?sendNotificationEmail=false`, { method:'POST', body:JSON.stringify({type:'user',role:'writer',emailAddress:user.email}) }); } catch {}
      }
    }
    for (const title of ['Products','Customers','Invoices','Payments','Staff','Change Log']) {
      const range = `'${title}'!A1:Z10000`;
      await googleApi(token, `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, { method:'PUT', body:JSON.stringify({range,majorDimension:'ROWS',values:rowsFor(title,payload)}) });
    }
    return NextResponse.json({ok:true,spreadsheetId});
  } catch (e:any) { return NextResponse.json({error:e?.message||'Google Sheets sync failed.'},{status:500}); }
}
