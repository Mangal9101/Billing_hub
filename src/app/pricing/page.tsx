'use client';

import { useEffect, useState } from 'react';
import { Check, Crown, Loader2, CreditCard, ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { getSession, clearSession } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const plans = [
  { id: 'monthly', name: 'Monthly', price: '₹2', period: ' / 7-day trial', description: '₹2 today, then ₹99/month', recurring: true, trial: true, features: ['₹2 for first 7 days', 'Then ₹99/month AutoPay', 'Automatic renewal', 'All Billing Hub features'] },
  { id: 'quarterly', name: '3 Months', price: '₹249', period: '/3 months', description: 'Quarterly AutoPay', recurring: true, trial: false, features: ['₹249 every 3 months', 'Automatic renewal', 'All Billing Hub features'] },
  { id: 'yearly', name: '12 Months', price: '₹899', period: '/12 months', description: 'Annual AutoPay', recurring: true, trial: false, features: ['₹899 every 12 months', 'Automatic renewal', 'All Billing Hub features'] },
  { id: 'lifetime', name: 'Lifetime', price: '₹2,499', period: ' one time', description: 'One-time payment', recurring: false, trial: false, features: ['No recurring payment', 'Lifetime access', 'All Billing Hub features'] },
];

export default function PricingPage() {
  const [loading, setLoading] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [status, setStatus] = useState<any>(null);
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
    if (!session?.accessToken) return;
    fetch('/api/razorpay/status', { headers: { Authorization: `Bearer ${session.accessToken}` }, cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setStatus(j.subscription || null))
      .catch(() => {});
  }, [session?.accessToken]);

  const currentPlan = plans.find((p) => p.id === status?.plan);
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

  const openCheckout = async (planId: string) => {
    if (!session?.accessToken) {
      toast.error('Please sign in first.');
      return;
    }
    setLoading(planId);
    try {
      const endpoint = planId === 'lifetime' ? '/api/razorpay/create-order' : '/api/razorpay/create-subscription';
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, trial: planId === 'monthly' }),
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
        theme: { color: '#7b3f18' },
        handler: async (response: any) => {
          const verify = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: planId === 'lifetime' ? 'order' : 'subscription',
              plan: planId,
              ...response,
            }),
          });
          const result = await verify.json().catch(() => ({}));
          if (!verify.ok) throw new Error(result?.error || 'Payment verification failed.');
          setStatus({
            plan: planId,
            status: 'active',
            lifetime: planId === 'lifetime',
            updatedAt: new Date().toISOString(),
            lastPaymentId: response?.razorpay_payment_id,
            razorpaySubscriptionId: response?.razorpay_subscription_id,
            razorpayOrderId: response?.razorpay_order_id,
          });
          toast.success('Payment successful. Your Billing Hub plan is active.');
          setLoading('');
        },
        modal: { ondismiss: () => setLoading('') },
      };

      if (planId === 'lifetime') {
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
    <div className="min-h-full bg-background p-5 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Billing Hub</p>
          {showSignOut && <button type="button" onClick={() => { clearSession(); window.location.href = '/sign-up-login'; }} className="absolute left-0 top-1/2 -translate-y-1/2 -scale-x-100 p-1 text-muted-foreground hover:text-foreground" title="Sign out"><LogOut size={21} strokeWidth={3}/></button>}<h1 className="text-3xl font-bold text-foreground">Plans & Billing</h1>
          <p className="text-sm text-muted-foreground mt-2">Choose a plan that fits your business.</p>
          {status?.status === 'active' && <div className="inline-flex items-center gap-2 mt-4 px-3 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm"><ShieldCheck size={15}/> Active plan: {status.plan === 'lifetime' ? 'Lifetime' : status.plan}</div>}
        </div>

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

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const busy = loading === plan.id;
            return (
              <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={`rounded-2xl border ${selectedPlan === plan.id ? 'border-primary shadow-lg' : 'border-border'} bg-card p-5 flex flex-col cursor-pointer transition-colors`}>
                {plan.id === 'monthly' && <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">Start here</div>}
                <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{plan.id === 'lifetime' ? <Crown size={18}/> : <CreditCard size={18}/>}</div><div><h2 className="font-semibold text-foreground">{plan.name}</h2><p className="text-xs text-muted-foreground">{plan.description}</p></div></div>
                <div className="mt-5"><span className="text-3xl font-bold text-foreground">{plan.price}</span><span className="text-xs text-muted-foreground">{plan.period}</span></div>
                <div className="mt-4 space-y-2 flex-1">{plan.features.map((f) => <div key={f} className="flex gap-2 text-sm text-muted-foreground"><Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/><span>{f}</span></div>)}</div>
                <button onClick={() => void openCheckout(plan.id)} disabled={!!loading} className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-2.5">
                  {busy ? <><Loader2 size={16} className="animate-spin"/>Processing...</> : plan.id === 'lifetime' ? 'Buy Lifetime' : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
