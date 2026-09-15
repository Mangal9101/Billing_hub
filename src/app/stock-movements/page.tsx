'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export default function StockMovementsPage() {
  const { data, ready, recordStockMovement } = useAppStore();
  const movements = data.movements;
  const products = data.products;
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MovementType | 'ALL'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ productId: '', type: 'IN' as MovementType, qty: 1, reason: '' });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const filtered = movements.filter((m) => {
    const matchSearch = m.productName.toLowerCase().includes(search.toLowerCase());
    const normalizedType = m.type === 'ADJUSTMENT' ? 'ADJUSTMENT' : m.type;
    const matchType = filterType === 'ALL' || normalizedType === filterType;
    return matchSearch && matchType;
  });

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.productId) e.productId = 'Product is required';
    if (form.qty <= 0) e.qty = 'Quantity must be greater than 0';
    if (!form.reason.trim()) e.reason = 'Reason is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    recordStockMovement(form.productId, form.type, form.qty, form.reason.trim());
    setShowModal(false);
    setForm({ productId: products[0]?.id || '', type: 'IN', qty: 1, reason: '' });
    setErrors({});
  };

  const typeConfig: Record<MovementType, { label: string; color: string; icon: React.ReactNode }> = {
    IN: { label: 'Stock In', color: 'text-green-600 bg-green-50', icon: <ArrowDownCircle size={14} className="text-green-600" /> },
    OUT: { label: 'Stock Out', color: 'text-red-600 bg-red-50', icon: <ArrowUpCircle size={14} className="text-red-600" /> },
    ADJUSTMENT: { label: 'Adjustment', color: 'text-amber-600 bg-amber-50', icon: <ArrowLeftRight size={14} className="text-amber-600" /> },
  };

  if (!ready) return null;

  return (
    <AppLayout activePath="/stock-movements">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Stock Movements</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{movements.length} total movements recorded</p>
          </div>
          <button onClick={() => { setForm({ productId: products[0]?.id || '', type: 'IN', qty: 1, reason: '' }); setErrors({}); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} />Record Movement
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search product..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" />
          </div>
          <div className="flex gap-2">
            {(['ALL', 'IN', 'OUT', 'ADJUSTMENT'] as const).map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                {t === 'ALL' ? 'All' : t === 'IN' ? 'Stock In' : t === 'OUT' ? 'Stock Out' : 'Adjustments'}
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm mobile-data-table movements-table">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Reason</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><ArrowLeftRight size={32} className="mx-auto mb-2 opacity-30" />No movements found</td></tr>
                )}
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{m.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{(products.find(p => p.id === m.productId)?.sku || '')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig[m.type].color}`}>
                        {typeConfig[m.type].icon}
                        {typeConfig[m.type].label}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono-nums font-semibold ${m.qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.qty > 0 ? '+' : ''}{m.qty} {m.unit || products.find(p => p.id === m.productId)?.unit || 'pcs'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{m.reason}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.date}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{m.by || data.business.ownerName || 'Owner'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4 scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Record Stock Movement</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
                <select className="input-field" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                  <option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['IN', 'OUT', 'ADJUSTMENT'] as MovementType[]).map((t) => (
                  <button key={t} onClick={() => setForm({ ...form, type: t })} className={`py-2 rounded-lg text-xs font-medium border transition-colors ${form.type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                    {t === 'IN' ? 'Stock In' : t === 'OUT' ? 'Stock Out' : 'Adjustment'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity *</label>
                  <input type="number" className={`input-field ${errors.qty ? 'border-red-400' : ''}`} placeholder="0" value={form.qty || ''} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
                  {errors.qty && <p className="text-xs text-red-500 mt-1">{errors.qty}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
                  <select className="input-field" value={products.find(p => p.id === form.productId)?.unit || 'pcs'} onChange={() => undefined} disabled>
                    {['kg', 'g', 'piece', 'box', 'packet'].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reason *</label>
                <input className={`input-field ${errors.reason ? 'border-red-400' : ''}`} placeholder="e.g. Fresh batch prepared" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">Record Movement</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
