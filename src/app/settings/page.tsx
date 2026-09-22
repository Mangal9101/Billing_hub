'use client';

import React, { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAppStore } from '@/lib/store';
import { getSession, getValidAccessToken } from '@/lib/auth';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SettingsPage() {
  const { data, ready, setBusiness } = useAppStore();
  const [form, setForm] = useState({ name: '', address: '', mobile: '', gstNumber: '', upiId: '' });
  const [saving, setSaving] = useState(false);
  const [upiOtpOpen, setUpiOtpOpen] = useState(false);
  const [upiOtp, setUpiOtp] = useState('');
  const [upiOtpEmail, setUpiOtpEmail] = useState('');
  const [upiOtpCooldown, setUpiOtpCooldown] = useState(0);
  const [upiOtpSent, setUpiOtpSent] = useState(false);
  const [upiOtpSending, setUpiOtpSending] = useState(false);
  const [upiOtpVerifying, setUpiOtpVerifying] = useState(false);
  const [pendingBusinessForm, setPendingBusinessForm] = useState<typeof form | null>(null);
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
    const token = await getValidAccessToken();
    if (!token) {
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    setUpiOtpSending(true);
    try {
      const response = await fetch('/api/business/upi/request-otp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = String(json?.error || '').toLowerCase();
        if (response.status === 429 || message.includes('rate limit') || message.includes('too many')) {
          throw new Error('Too many OTP requests. Please wait a minute and try again.');
        }
        throw new Error(json?.error || 'Unable to send UPI confirmation OTP.');
      }

      setPendingBusinessForm(businessForm);
      setUpiOtpEmail(String(json.email || ''));
      setUpiOtp('');
      setUpiOtpSent(true);
      setUpiOtpCooldown(60);
      setUpiOtpOpen(true);
      toast.success('UPI confirmation OTP sent to the business owner email.');
    } catch (e: any) {
      toast.error(e?.message || 'Unable to send UPI confirmation OTP.');
    } finally {
      setUpiOtpSending(false);
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
      const response = await fetch('/api/business/upi/verify-otp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: upiOtp }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = String(json?.error || '').toLowerCase();
        if (message.includes('expired') || message.includes('otp_expired')) {
          throw new Error('OTP expired. Please request a new OTP.');
        }
        throw new Error(json?.error || 'Invalid OTP. Please check the code and try again.');
      }

      setUpiOtpOpen(false);
      setUpiOtp('');
      setUpiOtpEmail('');
      setUpiOtpCooldown(0);
      const next = pendingBusinessForm;
      setPendingBusinessForm(null);
      if (next) saveBusinessDetails(next);
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
      if (upiOtpCooldown > 0 && !upiOtpOpen) {
        toast.info(`Please wait ${upiOtpCooldown}s before requesting another OTP.`);
        return;
      }
      setSaving(true);
      await requestUpiOtp({
        name: form.name,
        address: form.address,
        mobile: form.mobile,
        gstNumber: form.gstNumber,
        upiId: form.upiId,
      });
      setSaving(false);
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
            <input className="input-field" value={form.upiId} onChange={e => setForm({ ...form, upiId: e.target.value })} placeholder="yourname@upi" inputMode="email" autoCapitalize="none" autoCorrect="off" />
            <p className="text-[10px] text-muted-foreground mt-1">This UPI ID is used for customer payment QR codes on invoices.</p>
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

      {upiOtpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Confirm UPI ID</h2>
                <p className="text-sm text-muted-foreground mt-1">For security, verify this UPI change with the business owner's email OTP.</p>
              </div>
              <button
                type="button"
                onClick={() => { setUpiOtpOpen(false); setPendingBusinessForm(null); setUpiOtp(''); }}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="rounded-xl bg-secondary/60 border border-border p-4 mb-4">
              <p className="text-xs text-muted-foreground">OTP sent to</p>
              <p className="text-sm font-semibold text-foreground break-all mt-0.5">{upiOtpEmail || 'business owner email'}</p>
            </div>

            <label className="block text-xs font-medium text-muted-foreground mb-1.5">6-digit OTP</label>
            <input
              value={upiOtp}
              onChange={e => setUpiOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="input-field text-center text-xl font-mono tracking-[0.35em]"
              autoFocus
            />

            <div className="flex items-center justify-between gap-3 mt-4">
              <button
                type="button"
                onClick={() => requestUpiOtp(pendingBusinessForm || form)}
                disabled={upiOtpSending || upiOtpVerifying || upiOtpCooldown > 0}
                className="text-sm text-primary font-medium disabled:opacity-50"
              >
                {upiOtpCooldown > 0 ? `Resend in ${upiOtpCooldown}s` : 'Resend OTP'}
              </button>

              <button
                type="button"
                onClick={verifyUpiOtp}
                disabled={upiOtpVerifying || upiOtpSending || upiOtp.length !== 6}
                className="btn-primary px-5"
              >
                {upiOtpVerifying ? 'Verifying...' : 'Verify & Save'}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-4">
              The UPI ID is saved only after the OTP is verified.
            </p>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
