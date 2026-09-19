'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, isAdminAccount, type Permission } from '@/lib/auth';

const PUBLIC_PATHS = ['/sign-up-login', '/pricing'];
const SUBSCRIPTION_CACHE_KEY = 'billing_hub_subscription_cache_v1';
const SUBSCRIPTION_CACHE_MS = 60_000;

function isSubscriptionActive(subscription: any) {
  if (!subscription) return false;
  if (subscription.lifetime === true || subscription.plan === 'lifetime') return true;
  return ['active', 'trialing'].includes(String(subscription.status || '').toLowerCase());
}

function readSubscriptionCache(companyId: string) {
  try {
    const raw = sessionStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached?.companyId !== companyId || !cached?.subscription) return null;
    if (Date.now() - Number(cached.cachedAt || 0) > SUBSCRIPTION_CACHE_MS) return null;
    return cached.subscription;
  } catch {
    return null;
  }
}

function writeSubscriptionCache(companyId: string, subscription: any) {
  try {
    sessionStorage.setItem(
      SUBSCRIPTION_CACHE_KEY,
      JSON.stringify({ companyId, subscription, cachedAt: Date.now() })
    );
  } catch {}
}

function clearSubscriptionCache() {
  try { sessionStorage.removeItem(SUBSCRIPTION_CACHE_KEY); } catch {}
}

function responseOk(json: any) {
  return !!json && json.subscription !== undefined;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next')) {
        const s = getSession();
        if (pathname === '/pricing') {
          if (!s?.accessToken || !s.companyId) {
            router.replace('/sign-up-login');
            return;
          }
          // Render pricing immediately; verify active subscription in the background.
          if (!cancelled) setAllowed(true);
          fetch('/api/razorpay/status', {
            headers: { Authorization: `Bearer ${s.accessToken}` },
            cache: 'no-store',
          })
            .then((response) => response.json().catch(() => ({})))
            .then((json) => {
              if (!cancelled && isSubscriptionActive(json?.subscription)) router.replace('/');
            })
            .catch(() => {});
          return;
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
      // For normal accounts, reuse a very short-lived session cache so every
      // page change does not wait for another Supabase round trip.
      if (!isAdminAccount(s)) {
        const cachedSubscription = readSubscriptionCache(s.companyId);
        if (isSubscriptionActive(cachedSubscription)) {
          if (!cancelled) setAllowed(true);
          // Refresh in the background; a later inactive response still blocks access.
          void fetch('/api/razorpay/status', {
            headers: { Authorization: `Bearer ${s.accessToken}` },
            cache: 'no-store',
          })
            .then((response) => response.json().catch(() => ({})))
            .then((json) => {
              if (!responseOk(json) || !isSubscriptionActive(json?.subscription)) {
                clearSubscriptionCache();
                if (!cancelled) router.replace('/pricing?from=login');
                return;
              }
              writeSubscriptionCache(s.companyId, json.subscription);
            })
            .catch(() => {});
        } else {
          try {
            const response = await fetch('/api/razorpay/status', {
              headers: { Authorization: `Bearer ${s.accessToken}` },
              cache: 'no-store',
            });
            const json = await response.json().catch(() => ({}));
            if (!response.ok || !isSubscriptionActive(json?.subscription)) {
              clearSubscriptionCache();
              router.replace('/pricing?from=login');
              return;
            }
            writeSubscriptionCache(s.companyId, json.subscription);
          } catch {
            router.replace('/pricing');
            return;
          }
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
