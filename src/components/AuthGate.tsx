'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, isAdminAccount, type Permission } from '@/lib/auth';

const PUBLIC_PATHS = ['/sign-up-login', '/pricing'];
const SUBSCRIPTION_CACHE_KEY = 'billing_hub_subscription_cache_v1';
const SUBSCRIPTION_CACHE_MS = 30_000;

function isSubscriptionActive(subscription: any) {
  if (!subscription) return false;
  if (subscription.lifetime === true || subscription.plan === 'lifetime') return true;

  const status = String(subscription.status || '').toLowerCase();
  if (!['active', 'trialing'].includes(status)) return false;

  // A cancelled trial stops immediately. A cancelled paid plan remains
  // available only until its already-paid billing period ends.
  if (subscription.autoPayCancelled) {
    if (subscription.isTrial) return false;
    if (subscription.currentPeriodEndsAt) {
      const end = new Date(String(subscription.currentPeriodEndsAt)).getTime();
      if (Number.isFinite(end) && Date.now() >= end) return false;
    }
  }

  if (subscription.isTrial && subscription.trialEndsAt) {
    const end = new Date(String(subscription.trialEndsAt)).getTime();
    if (Number.isFinite(end) && Date.now() >= end) return false;
  }

  return true;
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

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const publicPath = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next');

      if (publicPath) {
        const s = getSession();

        if (pathname === '/pricing') {
          // Pricing must remain reachable from browser history even after
          // signing out. Do not replace /pricing with /sign-up-login when
          // there is no session; checkout itself already asks the user to
          // sign in. This preserves the expected Back flow:
          // Sign in -> Pricing -> Sign out -> Sign in -> Back -> Pricing.
          if (!cancelled) setAllowed(true);

          // /pricing is also the owner's Plans & Billing page.
          // Keep it reachable from the sidebar even when a subscription is active.
          // Subscription status is shown by PricingPage itself.
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

      // Check route permissions from the already-cached local session first.
      // This is synchronous and must not wait for any network request.
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

      if (isAdminAccount(s)) {
        if (!cancelled) setAllowed(true);
        return;
      }

      const cachedSubscription = readSubscriptionCache(s.companyId);
      if (isSubscriptionActive(cachedSubscription)) {
        if (!cancelled) setAllowed(true);
        return;
      }

      // Subscription status is the access gate. The server creates the free
      // 7-day access window on the first authenticated check.
      void fetch('/api/razorpay/status', {
        headers: { Authorization: `Bearer ${s.accessToken}` },
        cache: 'no-store',
      })
        .then(async (response) => {
          const json = await response.json().catch(() => ({}));

          if (response.ok && isSubscriptionActive(json?.subscription)) {
            writeSubscriptionCache(s.companyId, json.subscription);
            if (!cancelled) setAllowed(true);
            return;
          }

          clearSubscriptionCache();
          if (!cancelled) router.replace('/pricing?from=login');
        })
        .catch(() => {
          // Keep the cached/local app usable on transient network failures.
          // A later navigation or session refresh will retry verification.
        });
    };

    void check();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
