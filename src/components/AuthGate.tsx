'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, isAdminAccount, type Permission } from '@/lib/auth';

const PUBLIC_PATHS = ['/sign-up-login', '/pricing'];

function isSubscriptionActive(subscription: any) {
  if (!subscription) return false;
  if (subscription.lifetime === true || subscription.plan === 'lifetime') return true;
  return ['active', 'trialing'].includes(String(subscription.status || '').toLowerCase());
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next')) {
        if (pathname === '/pricing') {
          const s = getSession();
          if (!s?.accessToken || !s.companyId) {
            router.replace('/sign-up-login');
            return;
          }
          try {
            const response = await fetch('/api/razorpay/status', {
              headers: { Authorization: `Bearer ${s.accessToken}` },
              cache: 'no-store',
            });
            const json = await response.json().catch(() => ({}));
            if (!cancelled && response.ok && isSubscriptionActive(json?.subscription)) {
              router.replace('/');
              return;
            }
          } catch {
            // Keep pricing accessible so a user can retry payment.
          }
        }
        if (!cancelled) setAllowed(true);
        return;
      }

      const s = getSession();
      if (!s?.accessToken || !s.companyId) {
        router.replace('/sign-up-login');
        return;
      }

      // Admin account bypasses subscription gating.
      if (!isAdminAccount(s)) {
      // Every signed-in user must have an active plan or trial before using the app.
      try {
        const response = await fetch('/api/razorpay/status', {
          headers: { Authorization: `Bearer ${s.accessToken}` },
          cache: 'no-store',
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !isSubscriptionActive(json?.subscription)) {
          router.replace('/pricing?from=login');
          return;
        }
      } catch {
        router.replace('/pricing');
        return;
      }

      }

      const required: Array<[string, Permission]> = [
        ['/invoice-billing','billing_view'], ['/products','products_view'], ['/customers','customers_view'],
        ['/purchases','purchases_view'], ['/stock-movements','stock_view'], ['/khatabook','khatabook_view'],
        ['/staff','staff_view'], ['/settings','settings_view']
      ];
      const match = required.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
      if (match && !s.isOwner && !s.permissions.includes(match[1])) {
        router.replace('/');
        return;
      }

      if (!cancelled) setAllowed(true);
    };

    void check();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
