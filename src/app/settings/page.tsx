'use client';

import React, { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAppStore } from '@/lib/store';
import { getSession, getValidAccessToken, refreshAccessToken, updateAccessToken } from '@/lib/auth';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { createClient } from '@supabase/supabase-js';

export default function SettingsPage() {
  const { data, ready, setBusiness } = useAppStore();
  const [form, setForm] = useState({ name: '', address: '', mobile: '', gstNumber: '', upiId: '' });
  const [saving, setSaving] = useState(false);
  const [upiOtp, setUpiOtp] = useState('');
  const [upiOtpEmail, setUpiOtpEmail] = useState('');
  const [upiOtpCooldown, setUpiOtpCooldown] = useState(0);
  const [upiOtpSending, setUpiOtpSending] = useState(false);
  const [upiOtpVerifying, setUpiOtpVerifying] = useState(false);
  const [upiVerificationStarted, setUpiVerificationStarted] = useState(false);
  const [pendingBusinessForm, setPendingBusinessForm] = useState<typeof form | null>(null);
  const upiOtpRequestingRef = useRef(false);
  const ref = useRef<HTMLInputElement>(null);
  const session = getSession();

  useEffect(() => {
    if (!upiOtpCooldown) return;
    const timer = window.setInterval(() => setUpiOtpCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [upiOtpCooldown]);

  useEffect(() => {
    setForm({
      name: data.business.name || '',
      address: data.business.address || '',
      mobile: data.business.mobile || '',
      gstNumber: data.business.gstNumber || '',
      upiId: data.business.upiId || '',
    });
  }, [data.business.name, data.business.address, data.business.mobile, data.business.gstNumber, data.business.upiId]);

  if (!ready) return null;

  const saveBusinessDetails = (businessForm: typeof form) => {
    setSaving(true);
    setBusiness({
      name: businessForm.name.trim(),
      address: businessForm.address.trim(),
      mobile: businessForm.mobile.trim(),
      gstNumber: businessForm.gstNumber.trim().toUpperCase(),
      upiId: businessForm.upiId.trim(),
    });
    window.setTimeout(() => {
      setSaving(false);
      toast.success('Business details saved');
    }, 250);
  };

  const requestUpiOtp = async (businessForm: typeof form) => {
    if (upiOtpRequestingRef.current) return;
    upiOtpRequestingRef.current = true;

    let token = '';
    let refreshToken = '';

    // Always prefer the real Supabase browser session. The Billing Hub
    // localStorage token can still look valid as a JWT while Supabase has
    // rotated/revoked it, which causes the API to return "Invalid
    // authentication session".
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
      const current = await supabase.auth.getSession();
      if (current.data.session?.access_token) {
        token = current.data.session.access_token;
        refreshToken = current.data.session.refresh_token || '';
        updateAccessToken(token, refreshToken || undefined);
      } else {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.data.session?.access_token) {
          token = refreshed.data.session.access_token;
          refreshToken = refreshed.data.session.refresh_token || '';
          updateAccessToken(token, refreshToken || undefined);
        }
      }
    }

    // Fallback to the Billing Hub session only if the browser Supabase
    // session is unavailable.
    if (!token) {
      token = await getValidAccessToken();
      refreshToken = getSession()?.refreshToken || localStorage.getItem('billing_hub_refresh_token_v4') || '';
    }

    if (!token) {
      upiOtpRequestingRef.current = false;
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    setUpiOtpSending(true);
    try {
      const requestOtp = (accessToken: string) =>
        fetch('/api/business/upi/request-otp', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'X-Refresh-Token': refreshToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ upiId: businessForm.upiId.trim().toLowerCase() }),
        });

      let response = await requestOtp(token);
      let json = await response.json().catch(() => ({}));

      // The app can keep a locally cached access token while Supabase has
      // already rotated it. If the server rejects it, refresh once and retry.
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          response = await requestOtp(refreshed);
          json = await response.json().catch(() => ({}));
        }
      }
      if (json?.accessToken) updateAccessToken(String(json.accessToken), json?.refreshToken || undefined);
      if (!response.ok) {
        const message = String(json?.error || '').toLowerCase();
        if (response.status === 429 || message.includes('rate limit') || message.includes('too many')) {
          throw new Error('Too many OTP requests. Please wait a minute and try again.');
        }
        throw new Error(json?.error || 'Unable to send UPI confirmation OTP.');
      }

      setPendingBusinessForm(businessForm);
      setUpiOtpEmail(String(json.email || ''));
      setUpiVerificationStarted(true);
      setUpiOtp('');
      setUpiOtpCooldown(60);
      toast.success('OTP sent to the business owner email.');
    } catch (e: any) {
      toast.error(e?.message || 'Unable to send UPI confirmation OTP.');
    } finally {
      setUpiOtpSending(false);
      upiOtpRequestingRef.current = false;
    }
  };

  const verifyUpiOtp = async () => {
    if (!/^\d{6}$/.test(upiOtp)) {
      toast.error('Enter a valid 6-digit OTP.');
      return;
    }

    const token = await getValidAccessToken();
    if (!token) {
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    setUpiOtpVerifying(true);
    try {
      let refreshToken = getSession()?.refreshToken || localStorage.getItem('billing_hub_refresh_token_v4') || '';
      const response = await fetch('/api/business/upi/verify-otp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Refresh-Token': refreshToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: upiOtp, upiId: (pendingBusinessForm?.upiId || form.upiId).trim().toLowerCase() }),
      });
      const json = await response.json().catch(() => ({}));
      if (json?.accessToken) updateAccessToken(String(json.accessToken));
      if (!response.ok) {
        const message = String(json?.error || '').toLowerCase();
        if (message.includes('expired') || message.includes('otp_expired')) {
          throw new Error('OTP expired. Please request a new OTP.');
        }
        throw new Error(json?.error || 'Invalid OTP. Please check the code and try again.');
      }

      setUpiOtp('');
      setUpiOtpEmail('');
      setUpiOtpCooldown(0);
      setUpiVerificationStarted(false);
      const next = pendingBusinessForm;
      setPendingBusinessForm(null);
      if (next) {
        saveBusinessDetails(next);
        toast.success('UPI ID saved successfully.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Unable to verify OTP.');
    } finally {
      setUpiOtpVerifying(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Business name is required');
      return;
    }

    const currentUpi = (data.business.upiId || '').trim().toLowerCase();
    const nextUpi = form.upiId.trim().toLowerCase();

    // UPI is treated as a protected business setting. The first UPI ID and
    // every later change/removal require an OTP sent to the business owner's
    // authenticated email. Other business fields are saved after verification.
    if (currentUpi !== nextUpi) {
      if (!upiOtpEmail) {
        toast.info('UPI ID verify karne ke liye pehle Verify button dabayein.');
        return;
      }
      if (!/^\d{6}$/.test(upiOtp)) {
        toast.info('UPI save karne se pehle 6-digit OTP verify karein.');
        return;
      }
      await verifyUpiOtp();
      return;
    }

    saveBusinessDetails(form);
  };

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('Logo should be under 1 MB');
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      setBusiness({ logoUrl: String(r.result) });
      toast.success('Business logo updated');
      e.target.value = '';
    };
    r.readAsDataURL(file);
  };

  return (
    <AppLayout activePath="/settings">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Business</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Business name, logo, address, phone and GST are editable and saved separately for each business.</p>
        </div>

        <div className="card p-6 max-w-xl space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center text-primary text-xl font-bold">
              {data.business.logoUrl
                ? <img src={data.business.logoUrl} alt="Business logo" className="w-full h-full object-cover" />
                : (data.business.name?.[0] || 'B').toUpperCase()}
            </div>
            <div>
              <button className="btn-secondary" onClick={() => ref.current?.click()}>Add / Change Business Logo</button>
              <input ref={ref} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
              <p className="text-[10px] text-muted-foreground mt-1">PNG/JPG/WebP, max 1 MB · This is your business logo</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Business Name *</label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
            <textarea className="input-field min-h-[80px]" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Business address" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Mobile Number</label>
            <input className="input-field" inputMode="tel" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="+91 XXXXX XXXXX" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">GST Number</label>
            <input className="input-field uppercase" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} placeholder="GSTIN" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">UPI ID</label>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={form.upiId}
                onChange={e => {
                  setForm({ ...form, upiId: e.target.value });
                  setUpiOtp('');
                  setUpiOtpEmail('');
                  setUpiOtpCooldown(0);
                  setUpiVerificationStarted(false);
                }}
                placeholder="yourname@upi"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
              />
              {!upiVerificationStarted && (
                <button
                  type="button"
                  onClick={() => {
                    const currentUpi = (data.business.upiId || '').trim().toLowerCase();
                    const nextUpi = form.upiId.trim().toLowerCase();
                    if (!form.upiId.trim()) {
                      toast.info('Pehle UPI ID enter karein.');
                      return;
                    }
                    if (currentUpi === nextUpi) {
                      toast.info('UPI ID mein koi change nahi hai.');
                      return;
                    }
                    requestUpiOtp({
                      name: form.name,
                      address: form.address,
                      mobile: form.mobile,
                      gstNumber: form.gstNumber,
                      upiId: form.upiId
                    });
                  }}
                  disabled={upiOtpSending}
                  className="btn-primary shrink-0 px-4"
                >
                  {upiOtpSending ? 'Sending...' : 'Verify'}
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">UPI ID enter karke <span className="font-medium text-foreground">Verify</span> dabayein. OTP business owner ke email par bheja jayega.</p>

            {upiVerificationStarted && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-xs font-medium text-foreground mb-1">Verify UPI ID</p>
                <p className="text-xs text-muted-foreground mb-2">OTP sent to <span className="font-medium text-foreground">{upiOtpEmail || "business owner email"}</span></p>
                <div className="flex gap-2">
                  <input
                    value={upiOtp}
                    onChange={e => setUpiOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    className="input-field flex-1 text-center text-lg font-mono tracking-[0.25em]"
                  />
                  <button
                    type="button"
                    onClick={verifyUpiOtp}
                    disabled={upiOtpVerifying || upiOtp.length !== 6}
                    className="btn-primary shrink-0 px-4"
                  >
                    {upiOtpVerifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-muted-foreground">6-digit OTP enter karke Verify dabayein.</p>
                  <button
                    type="button"
                    onClick={() => requestUpiOtp(pendingBusinessForm || form)}
                    disabled={upiOtpSending || upiOtpCooldown > 0}
                    className="text-[10px] text-primary font-medium disabled:opacity-50"
                  >
                    {upiOtpCooldown > 0 ? `Resend in ${upiOtpCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="btn-primary flex items-center justify-center gap-2" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Business Details'}
          </button>
        </div>

        <div className="card p-6 max-w-xl space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Language</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choose English or Hindi. Hindi translation works locally without internet.</p>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="card p-6 max-w-xl space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Account & App</h2>
            <p className="text-xs text-muted-foreground mt-0.5">These values are controlled by your authenticated account.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">App Name</label>
              <div className="input-field bg-secondary/50 cursor-not-allowed">Billing Hub</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Owner Name</label>
              <div className="input-field bg-secondary/50 cursor-not-allowed">{data.business.ownerName || session?.name || 'Owner'}</div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Owner Email</label>
            <div className="input-field bg-secondary/50 cursor-not-allowed break-all">{data.business.ownerEmail || (session?.isOwner ? session.email : 'Owner account email')}</div>
          </div>
          <p className="text-[11px] text-muted-foreground">App Name, Owner Name and Owner Email are not editable from business settings.</p>
        </div>
      </div>



    </AppLayout>
  );
}
