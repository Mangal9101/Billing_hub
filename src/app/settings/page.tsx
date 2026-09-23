'use client';

import React, { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAppStore } from '@/lib/store';
import { getSession } from '@/lib/auth';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SettingsPage() {
  const { data, ready, setBusiness } = useAppStore();
  const [form, setForm] = useState({ name: '', address: '', mobile: '', gstNumber: '', upiId: '' });
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const session = getSession();

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

  const save = () => {
    if (!form.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    setSaving(true);
    setBusiness({
      name: form.name.trim(),
      address: form.address.trim(),
      mobile: form.mobile.trim(),
      gstNumber: form.gstNumber.trim().toUpperCase(),
      upiId: form.upiId.trim(),
    });
    window.setTimeout(() => {
      setSaving(false);
      toast.success('Business details saved');
    }, 250);
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
            <p className="text-[10px] text-muted-foreground mt-1">This UPI ID is used directly for customer payment QR codes on invoices. No OTP or bank-name verification is required.</p>
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
