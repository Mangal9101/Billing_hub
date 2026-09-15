'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, type Permission } from '@/lib/auth';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [allowed,setAllowed]=useState(false);
  useEffect(()=>{
    if(pathname==='/sign-up-login' || pathname.startsWith('/_next')) { setAllowed(true); return; }
    const s=getSession();
    if(!s?.accessToken || !s.companyId) { router.replace('/sign-up-login'); return; }
    const required: Array<[string, Permission]> = [
      ['/invoice-billing','billing_view'], ['/products','products_view'], ['/customers','customers_view'],
      ['/purchases','purchases_view'], ['/stock-movements','stock_view'], ['/khatabook','khatabook_view'],
      ['/staff','staff_view'], ['/settings','settings_view']
    ];
    const match = required.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
    if(match && !s.isOwner && !s.permissions.includes(match[1])) { router.replace('/'); return; }
    setAllowed(true);
  },[pathname,router]);
  if(!allowed) return null;
  return <>{children}</>;
}
