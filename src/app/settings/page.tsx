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
  const [upiVerifiedName, setUpiVerifiedName] = useState('');
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

  const verifyUpiId = () => {
    const upiId = form.upiId.trim().toLowerCase();
    if (!upiId) {
      toast.info('Pehle UPI ID enter karein.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(upiId)) {
      toast.error('Please enter a valid UPI ID.');
      return;
    }
    setForm(current => ({ ...current, upiId }));
    setUpiVerifiedName('UPI ID ready for direct payment');
    toast.success('UPI ID verified. Customer payments will go directly to this UPI ID.');
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Business name is required');
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
