'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSession, refreshAccessToken, getValidAccessToken } from '@/lib/auth';

export type Product = { id:string; name:string; sku:string; category:string; price:number; stock:number; unit:string; lowStockAlert:number; };
export type Customer = { id:string; name:string; phone:string; address:string; totalPurchases:number; outstanding:number; advance:number; lastVisit:string; };
export type InvoiceItem = { productId:string; name:string; sku:string; qty:number; unitPrice:number; total:number; };
export type Invoice = { id:string; customerId?:string; customer:string; phone:string; address:string; items:InvoiceItem[]; subtotal:number; discount:number; discountType:'flat'|'percent'; total:number; paid:number; due:number; mode:'Cash'|'UPI'|'Credit'; status:'Paid'|'Partial'|'Credit'; date:string; time:string; notes:string; };
export type LedgerEntry = { id:string; customerId:string; description:string; debit:number; credit:number; date:string; invoiceId?:string; };
export type PurchaseItem = { name:string; qty:number; unitPrice:number; total:number; productId?:string };
export type Purchase = { id:string; supplier:string; phone:string; items:PurchaseItem[]; total:number; paid:number; due:number; mode:'Cash'|'UPI'|'Credit'; date:string; notes:string; };
export type StockMovement = { id:string; productId:string; productName:string; type:'IN'|'OUT'|'ADJUSTMENT'; qty:number; reason:string; date:string; unit?:string; by?:string; refId?:string; };
export type Business = { id:string; name:string; ownerName?:string; ownerEmail?:string; logoUrl?:string; address?:string; mobile?:string; gstNumber?:string; ownerUserId?:string; };
export type ActivityCategory = 'invoice'|'products'|'khatabook';
export type ActivityEvent = { id:string; category:ActivityCategory; message:string; timestamp:number; read:boolean; };
export type ActivityState = { invoice:number; products:number; khatabook:number; };
export type AppData = { business:Business; products:Product[]; customers:Customer[]; invoices:Invoice[]; ledger:LedgerEntry[]; purchases:Purchase[]; movements:StockMovement[]; activity:ActivityState; notifications:ActivityEvent[]; };

const EMPTY_BUSINESS = { name:'My Business', address:'', mobile:'', gstNumber:'' };
const STORAGE_PREFIX = 'billing_hub_business_v4';
const tokenKey = 'billing_hub_access_token_v4';

// Coalesce rapid cloud writes so several UI state changes are persisted as one
// latest snapshot instead of creating a request waterfall under load.
let pendingCloudSave: { data: AppData; reason: string; clientUpdatedAt: number } | null = null;
let cloudSaveWorker: Promise<void> | null = null;
let latestCloudSaveVersion = 0;
let loadGeneration = 0;

function freshData(businessId?:string, ownerName?:string, ownerEmail?:string):AppData {
  return {
    business:{
      id:businessId || 'biz-empty',
      ...EMPTY_BUSINESS,
      ...(ownerName ? { ownerName } : {}),
      ...(ownerEmail ? { ownerEmail } : {}),
      ...(businessId ? { id:businessId } : {}),
    },
    activity:{invoice:0,products:0,khatabook:0},
    notifications:[],
    products:[],
    customers:[],
    invoices:[],
    ledger:[],
    purchases:[],
    movements:[],
  };
}

function storageKey(userId?:string,businessId?:string) {
  return userId && businessId ? `${STORAGE_PREFIX}:${userId}:${businessId}` : `${STORAGE_PREFIX}:guest`;
}
function normalizePhone(value:string=''){ return value.replace(/\D/g,'').slice(-10); }
function today(){ return new Date().toLocaleDateString('en-GB'); }
function time(){ return new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); }

function repairData(input:any, identity?:{businessId?:string; ownerName?:string; ownerEmail?:string}):AppData {
  const base=freshData(identity?.businessId,identity?.ownerName,identity?.ownerEmail);
  const d:AppData={
    ...base,
    ...input,
    business:{...base.business,...(input?.business||{}),id:identity?.businessId || input?.business?.id || base.business.id},
    activity:{...base.activity,...(input?.activity||{})},
    notifications:Array.isArray(input?.notifications)?input.notifications:[],
    products:Array.isArray(input?.products)?input.products:[],
    customers:Array.isArray(input?.customers)?input.customers:[],
    invoices:Array.isArray(input?.invoices)?input.invoices:[],
    ledger:Array.isArray(input?.ledger)?input.ledger:[],
    purchases:Array.isArray(input?.purchases)?input.purchases:[],
    movements:Array.isArray(input?.movements)?input.movements:[],
  };

  if(identity?.ownerName && identity?.ownerEmail && d.business.ownerUserId) {
    d.business.ownerName=identity.ownerName;
    d.business.ownerEmail=identity.ownerEmail;
  } else {
    if(identity?.ownerName && !d.business.ownerName) d.business.ownerName=identity.ownerName;
    if(identity?.ownerEmail && !d.business.ownerEmail) d.business.ownerEmail=identity.ownerEmail;
  }

  if(!d.notifications.length){
    const legacy:Array<[ActivityCategory,string]>=[
      ['invoice','Recent invoice/billing update'],
      ['products','Recent product/stock update'],
      ['khatabook','Recent Khatabook update'],
    ];
    d.notifications=legacy.flatMap(([category,message])=>{
      const stamp=d.activity[category];
      return stamp>0?[{id:'legacy-'+category,category,message,timestamp:stamp,read:false}]:[];
    });
  }

  const customers=[...d.customers].map((c:any)=>({
    ...c,
    totalPurchases:Number(c.totalPurchases)||0,
    outstanding:Math.max(0,Number(c.outstanding)||0),
    advance:Math.max(0,Number(c.advance)||0),
  }));

  const identityKey=(name:string,phone:string)=>`${(name||'').trim().toLowerCase()}|${normalizePhone(phone)}`;
  const findCustomer=(name:string,phone:string)=>{
    const nn=(name||'').trim();
    if(!nn || nn.toLowerCase()==='walk-in customer') return undefined;
    const key=identityKey(nn,phone);
    return customers.find(c=>identityKey(c.name,c.phone)===key)
      || customers.find(c=>!normalizePhone(phone) && c.name.trim().toLowerCase()===nn.toLowerCase());
  };

  d.invoices=d.invoices.map((inv:any)=>{
    const name=(inv.customer||'').trim();
    if(!name || name.toLowerCase()==='walk-in customer') return {...inv,customerId:undefined};

    // Preserve an existing invoice-to-customer relationship even when the
    // customer's master phone/name was later changed. Older code discarded a
    // valid customerId when its current details no longer matched the invoice's
    // historical details, which caused duplicate customers and stale numbers.
    const linked=inv.customerId ? customers.find(c=>c.id===inv.customerId) : undefined;
    const ledgerLink=d.ledger.find((entry:any)=>entry.invoiceId===inv.id)?.customerId;
    const ledgerCustomer=ledgerLink ? customers.find(c=>c.id===ledgerLink) : undefined;
    const exact=findCustomer(name,inv.phone||'');
    const sameNameCustomers=customers.filter(
      c=>c.name.trim().toLowerCase()===name.toLowerCase()
    );

    // A saved customerId is authoritative. Never replace it merely because
    // the invoice contains an older phone/name snapshot.
    // For legacy invoices without a link, use an exact name+phone match;
    // if there is exactly one customer with that name, link it.
    let c=linked || ledgerCustomer || exact;
    if(!c && sameNameCustomers.length===1) c=sameNameCustomers[0];

    if(!c){
      c={
        id:'c-'+crypto.randomUUID(),
        name,
        phone:normalizePhone(inv.phone||''),
        address:inv.address||'',
        totalPurchases:0,
        outstanding:0,
        advance:0,
        lastVisit:inv.date||today()
      };
      customers.push(c);
    }

    // Keep the invoice's displayed customer details synchronized with
    // the current customer master record. The original invoice totals/items
    // remain unchanged; only customer contact fields are refreshed.
    return {
      ...inv,
      customerId:c.id,
      customer:c.name,
      phone:c.phone||'',
      address:c.address||''
    };
  });

  // Make sure every unpaid invoice has a ledger debit.
  // The debit represents the original credit/receivable amount.
  const ledger=[...d.ledger];
  for(const inv of d.invoices){
    if(!inv.customerId || Number(inv.due)<=0) continue;

    const exists=ledger.some(e=>e.invoiceId===inv.id && e.customerId===inv.customerId && Number(e.debit)>0);
    if(!exists){
      ledger.push({
        id:'l-'+crypto.randomUUID(),
        customerId:inv.customerId,
        description:'Credit sale · '+inv.id,
        debit:Number(inv.due),
        credit:0,
        date:inv.date||today(),
        invoiceId:inv.id
      });
    } else {
      for(let n=0;n<ledger.length;n++){
        if(ledger[n].invoiceId===inv.id && ledger[n].debit>0){
          ledger[n]={...ledger[n],customerId:inv.customerId};
        }
      }
    }
  }

  d.customers=customers.map(c=>{
    const invoiceTotals=d.invoices
      .filter(i=>i.customerId===c.id)
      .reduce((s,i)=>s+(Number(i.total)||0),0);

    const customerLedger=ledger.filter(e=>e.customerId===c.id);
    const debitTotal=customerLedger.reduce((s,e)=>s+(Number(e.debit)||0),0);
    const creditTotal=customerLedger.reduce((s,e)=>s+(Number(e.credit)||0),0);
    const net=debitTotal-creditTotal;

    // Positive net = customer still owes us.
    // Negative net = customer has paid extra, so it is an advance.
    const hasLedger=customerLedger.length>0;
    const outstanding=hasLedger
      ? Math.max(0,net)
      : Math.max(0,Number(c.outstanding)||0);
    const advance=hasLedger
      ? Math.max(0,-net)
      : Math.max(0,Number(c.advance)||0);

    return {
      ...c,
      totalPurchases:Math.max(Number(c.totalPurchases)||0,invoiceTotals),
      outstanding,
      advance,
      lastVisit:c.lastVisit||today()
    };
  });

  d.ledger=ledger;
  return d;
}

function readLocal(userId?:string,businessId?:string,ownerName?:string,ownerEmail?:string):AppData {
  if(typeof window==='undefined') return freshData(businessId,ownerName,ownerEmail);
  try {
    const raw=localStorage.getItem(storageKey(userId,businessId));
    return raw
      ? repairData(JSON.parse(raw),{businessId,ownerName,ownerEmail})
      : freshData(businessId,ownerName,ownerEmail);
  } catch {
    return freshData(businessId,ownerName,ownerEmail);
  }
}

async function remoteLoad(
  token: string,
  businessId: string,
  identity: { ownerName?: string; ownerEmail?: string }
): Promise<AppData | null> {
  const request = (accessToken: string) =>
    fetch(`/api/data?businessId=${encodeURIComponent(businessId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

  try {
    let r = await request(token);

    if (r.status === 401) {
      const freshToken = await refreshAccessToken();
      if (freshToken) r = await request(freshToken);
    }

    if (!r.ok) return null;
    const json = await r.json();
    if (!json.payload) return null;

    return repairData(json.payload, {
      businessId,
      ownerName: identity.ownerName,
      ownerEmail: identity.ownerEmail,
    });
  } catch {
    return null;
  }
}

async function remoteSave(data: AppData, reason = 'Automatic backup before change', clientUpdatedAt = Date.now()) {
  if (typeof window === 'undefined') return;
  const session = getSession();
  const businessId = session?.companyId;
  if (!businessId) return;

  pendingCloudSave = { data, reason, clientUpdatedAt };
  latestCloudSaveVersion += 1;
  if (cloudSaveWorker) return;

  cloudSaveWorker = (async () => {
    try {
      while (pendingCloudSave) {
        const job = pendingCloudSave;
        pendingCloudSave = null;
        let token = await getValidAccessToken();
        if (!token) continue;

        const save = (accessToken: string) =>
          fetch('/api/data', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              businessId,
              payload: { ...job.data, _cloudUpdatedAt: job.clientUpdatedAt },
              reason: job.reason,
              action: 'DATA_UPDATE',
              summary: 'Billing Hub data changed',
            }),
          });

        try {
          let r = await save(token);
          if (r.status === 401) {
            const freshToken = await refreshAccessToken();
            if (!freshToken) continue;
            token = freshToken;
            r = await save(token);
          }
          if (!r.ok) {
            console.warn('Cloud sync failed:', r.status);
            continue;
          }

          // Only sync to Sheets when no newer local snapshot is waiting.
          if (!pendingCloudSave) {
            void fetch('/api/sheets/sync', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ businessId, payload: job.data }),
            }).catch(() => {});
          }
        } catch (error) {
          console.warn('Cloud sync error:', error);
        }
      }
    } finally {
      cloudSaveWorker = null;
      if (pendingCloudSave) {
        void remoteSave(pendingCloudSave.data, pendingCloudSave.reason, pendingCloudSave.clientUpdatedAt);
      }
    }
  })();

  await cloudSaveWorker;
}
interface Store {
  data:AppData;
  ready:boolean;
  userId?:string;
  markActivityRead:(category:ActivityCategory)=>void;
  recordStockMovement:(productId:string,type:StockMovement['type'],qty:number,reason:string)=>void;
  setBusiness:(patch:Partial<Business>)=>void;
  addProduct:(p:Omit<Product,'id'>)=>void;
  updateProduct:(id:string,p:Partial<Product>)=>void;
  deleteProduct:(id:string)=>void;
  addCustomer:(c:Omit<Customer,'id'|'totalPurchases'|'outstanding'|'advance'|'lastVisit'>)=>Customer;
  updateCustomer:(id:string,p:Partial<Customer>)=>void;
  deleteCustomer:(id:string)=>void;
  createInvoice:(input:Omit<Invoice,'id'|'date'|'time'|'status'|'due'>)=>Invoice;
  receivePayment:(customerId:string,amount:number,note?:string)=>void;
  addKhataEntry:(customerId:string,amount:number,description:string)=>void;
  addPurchase:(p:Omit<Purchase,'id'|'date'>)=>void;
  updatePurchase:(id:string,p:Partial<Purchase>)=>void;
  deletePurchase:(id:string)=>void;
}

const Ctx=createContext<Store|null>(null);

export function AppStoreProvider({children}:{children:React.ReactNode}){
  const [data,setData]=useState<AppData>(freshData());
  const [ready,setReady]=useState(false);
  const [cloudReady,setCloudReady]=useState(false);
  const [userId,setUserId]=useState<string|undefined>();

  const loadForSession=React.useCallback(async()=>{
    if(typeof window==='undefined') return;

    const session=getSession();

    if(!session?.uid || !session.companyId || !session.accessToken){
      setUserId(undefined);
      setData(freshData());
      setCloudReady(true);
      setReady(true);
      return;
    }

    const thisLoad=++loadGeneration;
    setUserId(session.uid);
    setCloudReady(false);

    setData(
      freshData(
        session.companyId,
        session.isOwner?session.name:undefined,
        session.isOwner?session.email:undefined
      )
    );

    const cached=readLocal(
      session.uid,
      session.companyId,
      session.isOwner?session.name:undefined,
      session.isOwner?session.email:undefined
    );
    // Render the cached snapshot immediately. Do not block the whole app
    // on the Supabase round-trip; the cloud snapshot is merged in below.
    setData(cached);
    setReady(true);

    const freshToken=await getValidAccessToken();
    const remote=await remoteLoad(
      freshToken || session.accessToken,
      session.companyId,
      session.isOwner
        ? {ownerName:session.name,ownerEmail:session.email}
        : {}
    );

    if(thisLoad!==loadGeneration ||
      !getSession() ||
      getSession()?.uid!==session.uid ||
      getSession()?.companyId!==session.companyId
    ) return;

    if (remote) {
      setData(remote);
      try {
        localStorage.setItem(
          storageKey(session.uid,session.companyId),
          JSON.stringify(remote)
        );
      } catch {}
    }

    setCloudReady(true);
    setReady(true);
  },[]);

  useEffect(()=>{
    void loadForSession();

    window.addEventListener('sawariya-auth',loadForSession);

    return()=>window.removeEventListener('sawariya-auth',loadForSession);
  },[loadForSession]);

  useEffect(()=>{
    if(!ready || !userId) return;

    const session=getSession();
    if(!session?.companyId) return;

    localStorage.setItem(
      storageKey(userId,session.companyId),
      JSON.stringify(data)
    );

    window.dispatchEvent(new Event('sawariya-data'));

    if(!cloudReady) return;

    const t=window.setTimeout(
      ()=>void remoteSave(data, 'Automatic backup before change', Date.now()),
      150
    );

    return()=>window.clearTimeout(t);
  },[data,ready,cloudReady,userId]);

  const setBusiness=(patch:Partial<Business>)=>
    setData(d=>({
      ...d,
      business:{
        ...d.business,
        ...patch,
        id:getSession()?.companyId||d.business.id
      }
    }));

  const pushActivity=(
    d:AppData,
    category:ActivityCategory,
    message:string
  ):AppData=>{
    const stamp=Date.now();

    return {
      ...d,
      activity:{...d.activity,[category]:stamp},
      notifications:[
        {
          id:'n-'+crypto.randomUUID(),
          category,
          message,
          timestamp:stamp,
          read:false
        },
        ...d.notifications
      ].slice(0,100)
    };
  };

  const markActivityRead=React.useCallback(
    (category:ActivityCategory)=>
      setData(d=>({
        ...d,
        notifications:d.notifications.map(n=>
          n.category===category?{...n,read:true}:n
        )
      })),
    []
  );

  const recordStockMovement=(
    productId:string,
    type:StockMovement['type'],
    qty:number,
    reason:string
  )=>
    setData(d=>{
      const product=d.products.find(p=>p.id===productId);
      if(!product||qty<=0) return d;

      const delta=type==='OUT'?-qty:qty;

      const movement:StockMovement={
        id:'m-'+crypto.randomUUID(),
        productId,
        productName:product.name,
        type,
        qty:delta,
        reason,
        date:today(),
        unit:product.unit,
        by:d.business.ownerName||'Owner'
      };

      return pushActivity(
        {
          ...d,
          products:d.products.map(p=>
            p.id===productId
              ? {...p,stock:Math.max(0,p.stock+delta)}
              : p
          ),
          movements:[movement,...d.movements]
        },
        'products',
        `${type==='IN'?'Stock added':type==='OUT'?'Stock removed':'Stock adjusted'}: ${product.name} (${qty} ${product.unit})`
      );
    });

  const addProduct=(p:Omit<Product,'id'>)=>
    setData(d=>
      pushActivity(
        {
          ...d,
          products:[...d.products,{...p,id:'p-'+crypto.randomUUID()}]
        },
        'products',
        `Product added: ${p.name}`
      )
    );

  const updateProduct=(id:string,p:Partial<Product>)=>
    setData(d=>{
      const old=d.products.find(x=>x.id===id);
      if(!old) return d;

      const nextProducts=d.products.map(x=>
        x.id===id?{...x,...p}:x
      );

      let next={...d,products:nextProducts};

      if(typeof p.stock==='number'&&p.stock!==old.stock){
        const delta=p.stock-old.stock;

        next={
          ...next,
          movements:[
            {
              id:'m-'+crypto.randomUUID(),
              productId:id,
              productName:old.name,
              type:'ADJUSTMENT',
              qty:delta,
              reason:'Product stock updated',
              date:today(),
              unit:old.unit,
              by:d.business.ownerName||'Owner'
            },
            ...d.movements
          ]
        };
      }

      return pushActivity(
        next,
        'products',
        `Product updated: ${old.name}`
      );
    });

  const deleteProduct=(id:string)=>
    setData(d=>
      pushActivity(
        {
          ...d,
          products:d.products.filter(x=>x.id!==id)
        },
        'products',
        'Product deleted'
      )
    );

  const addCustomer=(
    c:Omit<Customer,'id'|'totalPurchases'|'outstanding'|'advance'|'lastVisit'>
  ):Customer=>{
    const normalizedPhone=normalizePhone(c.phone||'');
    const normalizedName=(c.name||'').trim();

    let result:Customer={
      id:'c-'+crypto.randomUUID(),
      name:normalizedName||'Customer',
      phone:normalizedPhone,
      address:c.address||'',
      totalPurchases:0,
      outstanding:0,
      advance:0,
      lastVisit:today()
    };

    setData(d=>{
      const existing=d.customers.find(
        x=>
          x.name.trim().toLowerCase()===normalizedName.toLowerCase() &&
          normalizePhone(x.phone)===normalizedPhone
      );

      if(existing){
        result=existing;

        return {
          ...d,
          customers:d.customers.map(x=>
            x.id===existing.id
              ? {
                  ...x,
                  phone:normalizedPhone||x.phone,
                  address:c.address||x.address,
                  lastVisit:today()
                }
              : x
          )
        };
      }

      return {
        ...d,
        customers:[...d.customers,result]
      };
    });

    return result;
  };

  const updateCustomer=(id:string,p:Partial<Customer>)=>
    setData(d=>{
      const existingCustomer=d.customers.find(x=>x.id===id);
      if(!existingCustomer) return d;

      const nextCustomer={
        ...existingCustomer,
        ...p,
        name:(p.name ?? existingCustomer.name).trim(),
        phone:normalizePhone(p.phone ?? existingCustomer.phone),
        address:p.address ?? existingCustomer.address
      };

      // Important: older invoices may have been saved without customerId.
      // When the customer master is edited, permanently link those invoices
      // to this customer and refresh their displayed name/phone/address.
      const oldName=existingCustomer.name.trim().toLowerCase();
      const oldPhone=normalizePhone(existingCustomer.phone||'');

      const invoices=d.invoices.map(inv=>{
        const invoiceName=(inv.customer||'').trim().toLowerCase();
        const invoicePhone=normalizePhone(inv.phone||'');

        const linkedById=inv.customerId===id;
        const legacyMatch=
          invoiceName===oldName &&
          (!!oldPhone ? invoicePhone===oldPhone : true);

        // Once a customer is edited, all historical invoices belonging to
        // that customer name are updated to the new master contact details.
        // This also repairs invoices that were created before customerId
        // linkage existed.
        const sameCustomerName=invoiceName===oldName;

        if(!linkedById&&!legacyMatch&&!sameCustomerName) return inv;

        return {
          ...inv,
          customerId:id,
          customer:nextCustomer.name,
          phone:nextCustomer.phone||'',
          address:nextCustomer.address||''
        };
      });

      const affectedInvoiceIds=new Set(
        invoices
          .filter(inv=>inv.customerId===id)
          .map(inv=>inv.id)
      );

      const ledger=d.ledger.map(entry=>
        entry.invoiceId && affectedInvoiceIds.has(entry.invoiceId)
          ? {...entry,customerId:id}
          : entry
      );

      return {
        ...d,
        customers:d.customers.map(x=>x.id===id?nextCustomer:x),
        invoices,
        ledger
      };
    });

  const deleteCustomer=(id:string)=>
    setData(d=>({
      ...d,
      customers:d.customers.filter(x=>x.id!==id)
    }));

  const createInvoice=(
    input:Omit<Invoice,'id'|'date'|'time'|'status'|'due'>
  ):Invoice=>{
    const dueBeforeAdvance=Math.max(
      0,
      Number(input.total)-Number(input.paid)
    );

    const paid=Math.max(0,Number(input.paid)||0);

    const normalizedPhone=normalizePhone(input.phone||'');
    const normalizedName=(input.customer||'').trim();
    const isNamedCustomer=
      !!normalizedName &&
      normalizedName.toLowerCase()!=='walk-in customer';

    const invoiceId=
      'INV-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);

    const invBase:Omit<Invoice,'customerId'>={
      ...input,
      id:invoiceId,
      date:today(),
      time:time(),
      paid,
      due:dueBeforeAdvance,
      status:dueBeforeAdvance===0
        ? 'Paid'
        : paid>0
          ? 'Partial'
          : 'Credit',
      customer:normalizedName||'Walk-in Customer',
      phone:input.phone||'',
      address:input.address||''
    };

    let savedInvoice:Invoice={
      ...invBase,
      customerId:input.customerId||undefined
    };

    setData(d=>{
      let customers=[...d.customers];

      let customerId=
        input.customerId &&
        customers.some(c=>c.id===input.customerId)
          ? input.customerId
          : undefined;

      if(!customerId&&isNamedCustomer){
        const exact=customers.find(
          c=>
            c.name.trim().toLowerCase()===normalizedName.toLowerCase() &&
            normalizePhone(c.phone)===normalizedPhone
        );

        if(exact){
          customerId=exact.id;
        }else{
          customerId='c-'+crypto.randomUUID();

          customers.push({
            id:customerId,
            name:normalizedName,
            phone:normalizedPhone||input.phone||'',
            address:input.address||'',
            totalPurchases:0,
            outstanding:0,
            advance:0,
            lastVisit:today()
          });
        }
      }

      const existingCustomer=
        customerId
          ? customers.find(c=>c.id===customerId)
          : undefined;

      // Any advance already paid by this customer is automatically
      // consumed against the new credit.
      const existingAdvance=
        Math.max(0,Number(existingCustomer?.advance)||0);

      const advanceUsed=Math.min(
        existingAdvance,
        dueBeforeAdvance
      );

      const finalDue=
        Math.max(0,dueBeforeAdvance-advanceUsed);

      const finalStatus:Invoice['status']=
        finalDue===0
          ? 'Paid'
          : paid>0
            ? 'Partial'
            : 'Credit';

      const inv:Invoice={
        ...invBase,
        customerId,
        due:finalDue,
        status:finalStatus
      };

      savedInvoice=inv;

      if(customerId){
        customers=customers.map(c=>
          c.id===customerId
            ? {
                ...c,
                name:normalizedName||c.name,
                phone:normalizedPhone||input.phone||c.phone,
                address:input.address||c.address,
                totalPurchases:
                  (Number(c.totalPurchases)||0)+Number(inv.total||0),
                lastVisit:today()
              }
            : c
        );
      }

      const products=d.products.map(p=>{
        const item=inv.items.find(i=>i.productId===p.id);

        return item
          ? {...p,stock:Math.max(0,p.stock-item.qty)}
          : p;
      });

      const movements=[
        ...d.movements,
        ...inv.items.map(i=>({
          id:'m-'+crypto.randomUUID(),
          productId:i.productId,
          productName:i.name,
          type:'OUT' as const,
          qty:i.qty,
          reason:'Invoice '+inv.id,
          date:today(),
          refId:inv.id
        }))
      ];

      // IMPORTANT:
      // Ledger records the full receivable created by this invoice,
      // not only the final remaining due after consuming advance.
      const ledger=
        customerId&&dueBeforeAdvance>0
          ? [
              ...d.ledger,
              {
                id:'l-'+crypto.randomUUID(),
                customerId,
                description:'Credit sale · '+inv.id,
                debit:dueBeforeAdvance,
                credit:0,
                date:today(),
                invoiceId:inv.id
              }
            ]
          : d.ledger;

      if(customerId){
        const customerLedger=ledger.filter(e=>e.customerId===customerId);
        const debitTotal=customerLedger.reduce((sum,e)=>sum+(Number(e.debit)||0),0);
        const creditTotal=customerLedger.reduce((sum,e)=>sum+(Number(e.credit)||0),0);
        const net=debitTotal-creditTotal;
        customers=customers.map(c=>c.id===customerId?{
          ...c,
          outstanding:Math.max(0,net),
          advance:Math.max(0,-net),
          lastVisit:today()
        }:c);
      }

      let next=pushActivity(
        {
          ...d,
          invoices:[inv,...d.invoices],
          customers,
          products,
          movements,
          ledger
        },
        'invoice',
        `Invoice created: ${inv.id}`
      );

      next=pushActivity(
        next,
        'products',
        `Stock reduced by invoice: ${inv.id}`
      );

      if(dueBeforeAdvance>0){
        next=pushActivity(
          next,
          'khatabook',
          `Credit added: ${inv.customer||'Walk-in Customer'} · ₹${dueBeforeAdvance.toLocaleString('en-IN')}`
        );
      }

      if(advanceUsed>0){
        next=pushActivity(
          next,
          'khatabook',
          `Advance adjusted: ₹${advanceUsed.toLocaleString('en-IN')} · ${inv.customer||'Customer'}`
        );
      }

      return next;
    });

    return savedInvoice;
  };

  const addKhataEntry=(
    customerId:string,
    amount:number,
    description:string
  )=>
    setData(d=>{
      if(amount<=0) return d;

      const customer=d.customers.find(c=>c.id===customerId);
      if(!customer) return d;

      const existingLedger=d.ledger.filter(e=>e.customerId===customerId);
      const existingDebit=existingLedger.reduce((sum,e)=>sum+(Number(e.debit)||0),0);
      const existingCredit=existingLedger.reduce((sum,e)=>sum+(Number(e.credit)||0),0);
      const existingNet=existingDebit-existingCredit;
      const currentAdvance=Math.max(0,-existingNet);
      const advanceUsed=Math.min(currentAdvance,amount);

      const ledger=[
        ...d.ledger,
        {
          id:'l-'+crypto.randomUUID(),
          customerId,
          description,
          debit:amount,
          credit:0,
          date:today()
        }
      ];

      const newNet=existingNet+amount;
      const next={
        ...d,
        customers:d.customers.map(c=>
          c.id===customerId
            ? {
                ...c,
                outstanding:Math.max(0,newNet),
                advance:Math.max(0,-newNet),
                lastVisit:today()
              }
            : c
        ),
        ledger
      };

      let result=pushActivity(
        next,
        'khatabook',
        `Credit added: ₹${amount.toLocaleString('en-IN')} · ${description}`
      );

      if(advanceUsed>0){
        result=pushActivity(
          result,
          'khatabook',
          `Advance adjusted: ₹${advanceUsed.toLocaleString('en-IN')} · ${customer.name}`
        );
      }

      return result;
    });

  const receivePayment=(
    customerId:string,
    amount:number,
    note='Payment received'
  )=>
    setData(d=>{
      const c=d.customers.find(x=>x.id===customerId);
      if(!c||amount<=0) return d;

      // Always calculate the current balance from the ledger so an old/stale
      // customer balance can never swallow an overpayment.
      const existingLedger=d.ledger.filter(e=>e.customerId===customerId);
      const debitTotal=existingLedger.reduce((sum,e)=>sum+(Number(e.debit)||0),0);
      const creditTotal=existingLedger.reduce((sum,e)=>sum+(Number(e.credit)||0),0);
      const existingNet=debitTotal-creditTotal;
      const currentOutstanding=Math.max(0,existingNet);
      const appliedToDue=Math.min(amount,currentOutstanding);
      const extra=amount-appliedToDue;

      // IMPORTANT: store the FULL received amount. Extra becomes advance.
      const ledger=[
        ...d.ledger,
        {
          id:'l-'+crypto.randomUUID(),
          customerId,
          description:note,
          debit:0,
          credit:amount,
          date:today()
        }
      ];

      const newNet=existingNet-amount;
      const next={
        ...d,
        customers:d.customers.map(x=>
          x.id===customerId
            ? {
                ...x,
                outstanding:Math.max(0,newNet),
                advance:Math.max(0,-newNet),
                lastVisit:today()
              }
            : x
        ),
        ledger,
        invoices:d.invoices.map(inv=>{
          if(inv.customerId!==customerId||inv.due<=0||appliedToDue<=0) return inv;
          const used=Math.min(appliedToDue,inv.due);
          return {
            ...inv,
            paid:inv.paid+used,
            due:inv.due-used,
            status:inv.due-used===0?'Paid':'Partial'
          };
        })
      };

      let result=pushActivity(
        next,
        'khatabook',
        `Payment received: ₹${amount.toLocaleString('en-IN')} · ${c.name}`
      );

      if(extra>0){
        result=pushActivity(
          result,
          'khatabook',
          `Advance received: ₹${extra.toLocaleString('en-IN')} · ${c.name}`
        );
      }

      return result;
    });

  const addPurchase=(p:Omit<Purchase,'id'|'date'>)=>
    setData(d=>{
      const id='PUR-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
      const purchase:Purchase={...p,id,date:today()};
      let products=[...d.products];
      const movements=[...d.movements];

      for(const item of p.items){
        const normalizedName=(item.name||'').trim();
        if(!normalizedName||item.qty<=0) continue;

        const product=products.find(x=>
          x.name.trim().toLowerCase()===normalizedName.toLowerCase()
        );

        if(product){
          const nextPrice=Number(item.unitPrice)>0
            ? Number(item.unitPrice)
            : product.price;
          products=products.map(x=>
            x.id===product.id
              ? {...x,price:nextPrice,stock:x.stock+Number(item.qty)}
              : x
          );
          movements.push({
            id:'m-'+crypto.randomUUID(),
            productId:product.id,
            productName:normalizedName,
            type:'IN',
            qty:Number(item.qty),
            reason:'Purchase '+id,
            date:today(),
            unit:product.unit,
            refId:id
          });
        }else{
          const newProduct:Product={
            id:'p-'+crypto.randomUUID(),
            name:normalizedName,
            sku:'PUR-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,5).toUpperCase(),
            category:'',
            price:Number(item.unitPrice)||0,
            stock:Number(item.qty),
            unit:'piece',
            lowStockAlert:5
          };
          products.push(newProduct);
          movements.push({
            id:'m-'+crypto.randomUUID(),
            productId:newProduct.id,
            productName:newProduct.name,
            type:'IN',
            qty:Number(item.qty),
            reason:'Purchase '+id+' · New Product',
            date:today(),
            unit:newProduct.unit,
            refId:id
          });
        }
      }

      return pushActivity(
        {...d,purchases:[purchase,...d.purchases],products,movements},
        'products',
        'Purchase recorded: '+id
      );
    });
  const updatePurchase=(id:string,p:Partial<Purchase>)=>
    setData(d=>{
      const existing=d.purchases.find(x=>x.id===id);
      if(!existing) return d;

      const updatedPurchase:Purchase={
        ...existing,
        ...p,
        id:existing.id,
        date:p.date || existing.date,
      };

      // Keep product stock/price in sync with purchase edits.
      let products=[...d.products];
      let movements=[...d.movements];
      const oldQtyByProduct=new Map<string,number>();
      const newQtyByProduct=new Map<string,number>();
      const newItemByProduct=new Map<string,PurchaseItem>();

      for(const item of existing.items||[]){
        const productId=item.productId || products.find(x=>x.name.trim().toLowerCase()===item.name.trim().toLowerCase())?.id;
        if(productId) oldQtyByProduct.set(productId,(oldQtyByProduct.get(productId)||0)+Number(item.qty||0));
      }
      for(const item of updatedPurchase.items||[]){
        const productId=item.productId || products.find(x=>x.name.trim().toLowerCase()===item.name.trim().toLowerCase())?.id;
        if(productId){
          newQtyByProduct.set(productId,(newQtyByProduct.get(productId)||0)+Number(item.qty||0));
          newItemByProduct.set(productId,item);
        }
      }

      // Apply quantity difference for products that existed in the purchase.
      for(const [productId,oldQty] of oldQtyByProduct){
        const product=products.find(x=>x.id===productId);
        if(!product) continue;
        const newQty=newQtyByProduct.get(productId)||0;
        const delta=newQty-oldQty;
        const newItem=newItemByProduct.get(productId);
        const nextPrice=newItem && Number(newItem.unitPrice)>0 ? Number(newItem.unitPrice) : product.price;
        products=products.map(x=>x.id===productId?{...x,stock:Math.max(0,x.stock+delta),price:nextPrice}:x);
        if(delta!==0){
          movements.push({id:'m-'+crypto.randomUUID(),productId,productName:product.name,type:delta>0?'IN':'OUT',qty:delta,reason:'Purchase edited '+id,date:today(),unit:product.unit,refId:id});
        }
      }

      // Add newly introduced existing products or create new products.
      for(const item of updatedPurchase.items||[]){
        const name=(item.name||'').trim();
        if(!name||Number(item.qty)<=0) continue;
        const product=products.find(x=>x.name.trim().toLowerCase()===name.toLowerCase());
        if(!product) {
          const newProduct:Product={id:'p-'+crypto.randomUUID(),name,sku:'PUR-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,5).toUpperCase(),category:'',price:Number(item.unitPrice)||0,stock:Number(item.qty),unit:'piece',lowStockAlert:5};
          products.push(newProduct);
          movements.push({id:'m-'+crypto.randomUUID(),productId:newProduct.id,productName:newProduct.name,type:'IN',qty:newProduct.stock,reason:'Purchase edited '+id+' · New Product',date:today(),unit:newProduct.unit,refId:id});
        } else if(!oldQtyByProduct.has(product.id)) {
          const qty=Number(item.qty||0);
          products=products.map(x=>x.id===product.id?{...x,stock:x.stock+qty,price:Number(item.unitPrice)>0?Number(item.unitPrice):x.price}:x);
          movements.push({id:'m-'+crypto.randomUUID(),productId:product.id,productName:product.name,type:'IN',qty,reason:'Purchase edited '+id,date:today(),unit:product.unit,refId:id});
        }
      }

      return pushActivity(
        {...d,purchases:d.purchases.map(x=>x.id===id?updatedPurchase:x),products,movements},
        'products',
        'Purchase updated: '+id
      );
    });

  const deletePurchase=(id:string)=>
    setData(d=>
      pushActivity(
        {...d,purchases:d.purchases.filter(x=>x.id!==id)},
        'products',
        'Purchase deleted: '+id
      )
    );

  const value=useMemo(
    ()=>({
      data,
      ready,
      userId,
      setBusiness,
      markActivityRead,
      recordStockMovement,
      addProduct,
      updateProduct,
      deleteProduct,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      createInvoice,
      receivePayment,
      addKhataEntry,
      addPurchase,
      updatePurchase,
      deletePurchase
    }),
    [data,ready,userId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(){
  const c=useContext(Ctx);

  if(!c){
    throw new Error(
      'useAppStore must be used inside AppStoreProvider'
    );
  }

  return c;
}
