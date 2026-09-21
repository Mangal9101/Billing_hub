'use client';

import { useEffect, useState } from 'react';
import { Check, Crown, Loader2, CreditCard, ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { getSession, clearSession } from '@/lib/auth';
import AppLayout from '@/components/AppLayout';
import { useRouter, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const plans = [
  { id: 'trial', name: 'Trial', price: '₹2', period: ' / 7 days', description: '7-day trial, then ₹99/month', recurring: true, trial: true, features: ['₹2 today', '7-day access', 'Then ₹99/month AutoPay', 'All Billing Hub features'] },
  { id: 'monthly', name: 'Monthly', price: '₹99', period: ' / month', description: 'Monthly AutoPay', recurring: true, trial: false, features: ['₹99 every month', 'Automatic renewal', 'All Billing Hub features'] },
  { id: 'quarterly', name: '3 Months', price: '₹249', period: ' / 3 months', description: 'Quarterly AutoPay', recurring: true, trial: false, features: ['₹249 every 3 months', 'Automatic renewal', 'All Billing Hub features'] },
  { id: 'yearly', name: '12 Months', price: '₹899', period: ' / 12 months', description: 'Annual AutoPay', recurring: true, trial: false, features: ['₹899 every 12 months', 'Automatic renewal', 'All Billing Hub features'] },
  { id: 'lifetime', name: 'Lifetime', price: '₹2,499', period: ' one time', description: 'One-time payment', recurring: false, trial: false, features: ['No recurring payment', 'Lifetime access', 'All Billing Hub features'] },
];

export default function PricingPage() {
  const [loading, setLoading] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [status, setStatus] = useState<any>(null);
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSignOut = searchParams.get('from') === 'login';
  const session = getSession();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      setStatusLoaded(true);
      return;
    }

    let cancelled = false;

    // Restore the last confirmed subscription immediately so refreshes do not
    // briefly hide/show the Current Plan card or the Trial card.
    try {
      const raw = sessionStorage.getItem('billing_hub_subscription_cache_v1');
      if (raw) {
        const cached = JSON.parse(raw);
        if (!cached?.companyId || cached.companyId === session.companyId) {
          if (!cancelled && cached?.subscription) {
            setStatus(cached.subscription);
            setTrialEligible(false);
          }
        }
      }
    } catch {}

    fetch('/api/razorpay/status', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const nextSubscription = j.subscription || null;
        setStatus(nextSubscription);
        setTrialEligible(j.trialEligible !== false);
        try {
          if (session.companyId) {
            sessionStorage.setItem(
              'billing_hub_subscription_cache_v1',
              JSON.stringify({
                companyId: session.companyId,
                subscription: nextSubscription,
                cachedAt: Date.now(),
              })
            );
          }
        } catch {}
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatusLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, session?.companyId]);

  const currentPlan = plans.find((p) => p.id === status?.plan);
  const isLifetimePlan = status?.lifetime === true || String(status?.plan || '').toLowerCase() === 'lifetime';
  // Trial is its own card. It is removed permanently once the server says the
  // account has already used a trial; Monthly and every paid plan stay independent.
  const visiblePlans = !statusLoaded || isLifetimePlan
    ? []
    : trialEligible === false
      ? plans.filter((p) => p.id !== 'trial')
      : trialEligible === true
        ? plans
        : plans.filter((p) => p.id !== 'trial');
  const formatDate = (value: unknown) => {
    if (!value) return 'Not available';
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const activationDate = status?.updatedAt || status?.activatedAt;
  const nextBillingDate = (() => {
    if (!activationDate || status?.lifetime) return null;
    const date = new Date(String(activationDate));
    if (Number.isNaN(date.getTime())) return null;
    if (status?.plan === 'monthly') date.setDate(date.getDate() + 7);
    else if (status?.plan === 'quarterly') date.setMonth(date.getMonth() + 3);
    else if (status?.plan === 'yearly') date.setFullYear(date.getFullYear() + 1);
    else return null;
    return date;
  })();

  const cancelAutoPay = async () => {
    if (!session?.accessToken || !status?.razorpaySubscriptionId) return;
    const confirmed = window.confirm(
      status?.isTrial
        ? 'Cancel the 7-day trial now? Access will stop immediately and the ₹2 trial cannot be used again.'
        : 'Cancel AutoPay? Your current paid access will remain active until the current billing period ends.'
    );
    if (!confirmed) return;

    setLoading('cancel');
    try {
      const response = await fetch('/api/razorpay/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || 'Unable to cancel AutoPay.');

      setStatus(result?.subscription || null);
      if (result?.subscription?.isTrial) setTrialEligible(false);
      try {
        if (session.companyId) {
          sessionStorage.setItem(
            'billing_hub_subscription_cache_v1',
            JSON.stringify({
              companyId: session.companyId,
              subscription: result?.subscription,
              cachedAt: Date.now(),
            })
          );
        }
      } catch {}

      if (result?.subscription?.isTrial) {
        toast.success('Trial cancelled. Access is now stopped.');
      } else {
        toast.success(
          result?.accessUntil
            ? `AutoPay cancelled. Access remains active until ${formatDate(result.accessUntil)}.`
            : 'AutoPay cancelled. Current paid access remains active until expiry.'
        );
      }
    } catch (e: any) {
      toast.error(e?.message || 'Unable to cancel AutoPay.');
    } finally {
      setLoading('');
    }
  };

  const openCheckout = async (planId: string) => {
    if (!session?.accessToken) {
      toast.error('Please sign in first.');
      return;
    }

    // Trial is only a separate UI offer. Razorpay still creates the monthly
    // subscription underneath it, so the ₹99 AutoPay starts after 7 days.
    const razorpayPlan = planId === 'trial' ? 'monthly' : planId;
    const isTrialCheckout = planId === 'trial';

    setLoading(planId);
    try {
      const endpoint = razorpayPlan === 'lifetime' ? '/api/razorpay/create-order' : '/api/razorpay/create-subscription';
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: razorpayPlan, trial: isTrialCheckout }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Unable to start payment.');

      const waitForRazorpay = async () => {
        for (let i = 0; i < 50; i++) {
          if (window.Razorpay) return;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('Payment checkout could not be loaded. Please try again.');
      };
      await waitForRazorpay();

      const options: Record<string, unknown> = {
        key: data.keyId,
        name: 'Billing Hub',
        description: plans.find((p) => p.id === planId)?.description || 'Billing Hub plan',
        prefill: data.prefill,
        // Keep UPI visible and prominent in Razorpay Checkout. Razorpay's
        // Standard Checkout supports runtime payment-method configuration;
        // the actual UPI instruments shown still depend on the merchant
        // account's enabled payment methods.
        config: {
          display: {
            blocks: {
              billingHubUpi: {
                name: 'UPI',
                instruments: [{ method: 'upi' }],
              },
            },
            sequence: ['block.billingHubUpi', 'card', 'netbanking', 'wallet'],
            preferences: { show_default_blocks: true },
          },
        },
        theme: { color: '#7b3f18' },
        handler: async (response: any) => {
          const verify = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: razorpayPlan === 'lifetime' ? 'order' : 'subscription',
              plan: razorpayPlan,
              trial: isTrialCheckout && Boolean(data?.trial),
              trialEndsAt: data?.trialEndsAt || null,
              ...response,
            }),
          });
          const result = await verify.json().catch(() => ({}));
          if (!verify.ok) throw new Error(result?.error || 'Payment verification failed.');
          const verifiedSubscription = result?.subscription || {
            plan: razorpayPlan,
            status: 'active',
            lifetime: razorpayPlan === 'lifetime',
            isTrial: isTrialCheckout,
            updatedAt: new Date().toISOString(),
            lastPaymentId: response?.razorpay_payment_id,
            razorpaySubscriptionId: response?.razorpay_subscription_id,
            razorpayOrderId: response?.razorpay_order_id,
          };
          setStatus(verifiedSubscription);
          if (isTrialCheckout) setTrialEligible(false);
          try {
            if (session.companyId) {
              sessionStorage.setItem(
                'billing_hub_subscription_cache_v1',
                JSON.stringify({
                  companyId: session.companyId,
                  subscription: verifiedSubscription,
                  cachedAt: Date.now(),
                })
              );
            }
          } catch {}
          toast.success('Payment successful. Opening Dashboard...');
          setLoading('');
          window.location.replace('/');
        },
        modal: { ondismiss: () => setLoading('') },
      };

      if (razorpayPlan === 'lifetime') {
        options.order_id = data.orderId;
        options.amount = data.amount;
        options.currency = data.currency;
      } else {
        options.subscription_id = data.subscriptionId;
      }

      const checkout = new window.Razorpay!(options);
      checkout.open();
    } catch (e: any) {
      setLoading('');
      toast.error(e?.message || 'Unable to start payment.');
    }
  };

  return (
    <AppLayout activePath="/pricing">
      <div className="min-h-full bg-background p-5 md:p-8">
      <div className="max-w-6xl mx-auto">
        {statusLoaded && !isLifetimePlan && (
          <div className="relative text-center mb-8">
            {showSignOut && <button type="button" onClick={() => { clearSession(); window.location.href = '/sign-up-login'; }} className="absolute left-0 top-1/2 -translate-y-1/2 -scale-x-100 p-1 text-muted-foreground hover:text-foreground" title="Sign out"><LogOut size={21} strokeWidth={3}/></button>}
            <h1 className="text-3xl font-bold text-foreground">Plans & Billing</h1>
            <p className="text-sm text-muted-foreground mt-2">Choose a plan that fits your business.</p>
            {status?.status === 'active' && <div className="inline-flex items-center gap-2 mt-4 px-3 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm"><ShieldCheck size={15}/> Active plan: {status.plan === 'lifetime' ? 'Lifetime' : status.plan}</div>}
          </div>
        )}

        {status?.status === 'active' && (
          <div className="mb-7 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-green-600" />
                  <h2 className="text-lg font-bold text-foreground">Your Current Plan</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Your active Billing Hub subscription and payment details.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-600" /> Active
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">Current plan</p>
                <p className="mt-1 font-semibold text-foreground">{currentPlan?.name || status.plan || 'Active'}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="mt-1 font-semibold text-foreground">{currentPlan?.price || '—'} <span className="text-xs font-normal text-muted-foreground">{currentPlan?.period || ''}</span></p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">Activated on</p>
                <p className="mt-1 font-semibold text-foreground">{formatDate(activationDate)}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">{status?.lifetime ? 'Validity' : 'Next billing'}</p>
                <p className="mt-1 font-semibold text-foreground">{status?.lifetime ? 'Lifetime — No expiry' : formatDate(nextBillingDate)}</p>
              </div>
            </div>

            {status?.autoPayCancelled && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  AutoPay cancelled
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  {status?.isTrial
                    ? 'Trial access has ended immediately. Your ₹2 trial cannot be used again.'
                    : status?.currentPeriodEndsAt
                      ? `Paid access remains active until ${formatDate(status.currentPeriodEndsAt)}.`
                      : 'Your current paid access remains active until the paid period ends.'}
                </p>
              </div>
            )}

            {!status?.autoPayCancelled && status?.razorpaySubscriptionId && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void cancelAutoPay()}
                  disabled={loading === 'cancel'}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {loading === 'cancel' ? 'Cancelling AutoPay...' : 'Cancel AutoPay'}
                </button>
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Billing cycle</p>
                <p className="mt-1 text-sm font-medium text-foreground">{status?.lifetime ? 'One-time payment' : currentPlan?.period?.replace(/^\s*\//, '') || 'Recurring'}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Payment / subscription ID</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{status?.lastPaymentId || status?.razorpaySubscriptionId || status?.razorpayOrderId || 'Not available'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {visiblePlans.map((plan) => {
            const busy = loading === plan.id;
            const isTrial = plan.id === 'trial';
            return (
              <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={`rounded-2xl border ${selectedPlan === plan.id ? 'border-primary shadow-lg' : 'border-border'} bg-card p-5 flex flex-col cursor-pointer transition-colors`}>
                {isTrial && <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">New account offer</div>}
                {plan.id === 'monthly' && <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">Monthly AutoPay</div>}
                <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{plan.id === 'lifetime' ? <Crown size={18}/> : <CreditCard size={18}/>}</div><div><h2 className="font-semibold text-foreground">{plan.name}</h2><p className="text-xs text-muted-foreground">{plan.description}</p></div></div>
                <div className="mt-5"><span className="text-3xl font-bold text-foreground">{plan.price}</span><span className="text-xs text-muted-foreground">{plan.period}</span></div>
                <div className="mt-4 space-y-2 flex-1">{plan.features.map((f) => <div key={f} className="flex gap-2 text-sm text-muted-foreground"><Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/><span>{f}</span></div>)}</div>
                <button onClick={() => void openCheckout(plan.id)} disabled={!!loading || (isTrial && trialEligible !== true)} className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-2.5">
                  {busy ? <><Loader2 size={16} className="animate-spin"/>Processing...</> : isTrial ? 'Start ₹2 Trial' : plan.id === 'lifetime' ? 'Buy Lifetime' : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
