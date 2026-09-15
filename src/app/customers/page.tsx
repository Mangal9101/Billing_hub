'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, Edit2, Trash2, X, Users, Phone, MapPin } from 'lucide-react';
import { useAppStore, type Customer } from '@/lib/store';

const emptyCustomer: Omit<Customer, 'id' | 'totalPurchases' | 'outstanding' | 'lastVisit'> = {
  name: '', phone: '', address: '',
};

export default function CustomersPage() {
  const { data, ready, addCustomer, updateCustomer, deleteCustomer } = useAppStore();
  const customers = data.customers;
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<typeof emptyCustomer>(emptyCustomer);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingCustomer(null);
    setForm(emptyCustomer);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({ name: c.name, phone: c.phone, address: c.address });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.name.trim()) e.name = 'Customer name required';
    if (!form.phone.trim()) e.phone = 'Phone number required';
    else if (!/^\d{10}$/.test(form.phone)) e.phone = 'Enter valid 10-digit phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, form);
    } else {
      addCustomer(form);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    setDeleteConfirm(null);
    setShowModal(false);
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);

  if (!ready) return null;

  return (
    <AppLayout activePath="/customers">
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 max-w-screen-2xl mx-auto space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-2xl font-bold text-foreground">Customers</h1>
            <p className="text-sm sm:text-sm text-muted-foreground mt-1">
              {customers.length} customers · ₹{totalOutstanding.toLocaleString('en-IN')} outstanding
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 shrink-0 min-h-10 px-3 sm:px-4">
            <Plus size={17} />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-sm">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 min-h-11 text-base sm:text-sm"
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm mobile-data-table customers-table">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Address</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total Purchases</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      No customers found
                    </td>
                  </tr>
                )}
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openEdit(c)}
                    className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-xs font-semibold">{c.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-primary underline decoration-primary/30 underline-offset-4">{c.name}</p>
                          <p className="text-xs text-muted-foreground">Last visit: {c.lastVisit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-muted-foreground"><Phone size={12} />{c.phone}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-muted-foreground text-xs"><MapPin size={11} />{c.address || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-nums">₹{c.totalPurchases.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono-nums font-medium ${c.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {c.outstanding > 0 ? `₹${c.outstanding.toLocaleString('en-IN')}` : 'Cleared'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Vertical Customer Cards */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="card text-center py-12 text-muted-foreground">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-base">No customers found</p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openEdit(c)}
                className="card w-full text-left p-4 sm:p-5 active:scale-[0.99] transition-all hover:bg-secondary/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex max-w-full items-center rounded-lg bg-primary/10 px-3 py-1.5 ring-1 ring-primary/15">
                      <span className="text-lg font-bold text-primary truncate">{c.name}</span>
                    </div>
                    
                  </div>

                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-base font-bold">{c.name.charAt(0)}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                    <span className="text-muted-foreground flex items-center gap-2"><Phone size={15} /> Phone</span>
                    <span className="font-semibold text-foreground">{c.phone}</span>
                  </div>

                  <div className="flex items-start justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                    <span className="text-muted-foreground flex items-center gap-2 shrink-0"><MapPin size={15} /> Address</span>
                    <span className="font-medium text-foreground text-right break-words">{c.address || '—'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                    <span className="text-muted-foreground">Total Purchases</span>
                    <span className="font-bold text-foreground">₹{c.totalPurchases.toLocaleString('en-IN')}</span>
                  </div>

                  <div className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                    c.outstanding > 0 ? 'bg-red-50 ring-1 ring-red-100' : 'bg-green-50 ring-1 ring-green-100'
                  }`}>
                    <span className={`font-semibold ${c.outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {c.outstanding > 0 ? 'Outstanding' : 'Status'}
                    </span>
                    <span className={`font-bold ${c.outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {c.outstanding > 0 ? `₹${c.outstanding.toLocaleString('en-IN')}` : 'Cleared'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Last visit: {c.lastVisit}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in p-3 sm:p-0">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-auto scale-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-semibold text-foreground">
                {editingCustomer ? 'Update Customer' : 'Add Customer'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X size={19} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Customer Name *</label>
                <input
                  className={`input-field min-h-11 text-base ${errors.name ? 'border-red-400' : ''}`}
                  placeholder="Customer Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Phone Number *</label>
                <input
                  className={`input-field min-h-11 text-base ${errors.phone ? 'border-red-400' : ''}`}
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  inputMode="numeric"
                  maxLength={10}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Address</label>
                <textarea
                  className="input-field resize-none text-base"
                  rows={3}
                  placeholder="Full address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-t border-border sticky bottom-0 bg-card">
              {editingCustomer ? (
                <>
                  <button
                    onClick={() => setDeleteConfirm(editingCustomer.id)}
                    className="flex-1 min-h-11 bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 min-h-11 btn-primary"
                  >
                    Update
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowModal(false)} className="flex-1 min-h-11 btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleSave} className="flex-1 min-h-11 btn-primary">
                    Add Customer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 fade-in p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm scale-in p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Delete Customer</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 min-h-11">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 min-h-11 bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
