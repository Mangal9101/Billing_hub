'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, Edit2, Trash2, X, ShoppingCart, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { useAppStore, type Purchase, type PurchaseItem } from '@/lib/store';

const emptyForm: {supplier:string;phone:string;mode:'Cash'|'UPI'|'Credit';notes:string;items:{name:string;qty:number;unitPrice:number;total:number}[]} = { supplier: '', phone: '', mode: 'Cash', notes: '', items: [{ name: '', qty: 1, unitPrice: 0, total: 0 }] };

export default function PurchasesPage() {
  const { data, ready, addPurchase, updatePurchase, deletePurchase } = useAppStore();
  const purchases = data.purchases;
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [paidAmount, setPaidAmount] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [activeItemSuggestion, setActiveItemSuggestion] = useState<number | null>(null);

  const productSuggestions = (idx: number) => {
    const query = form.items[idx]?.name?.trim().toLowerCase() || '';
    if (!query) return [];
    return data.products.filter(product =>
      product.name.toLowerCase().includes(query)
    ).slice(0, 8);
  };

  const selectProduct = (idx: number, product: typeof data.products[number]) => {
    const items = [...form.items];
    items[idx] = {
      ...items[idx],
      name: product.name,
      unitPrice: product.price,
      total: items[idx].qty * product.price,
      productId: product.id,
    };
    setForm({ ...form, items });
    setActiveItemSuggestion(null);
  };

  const filtered = purchases.filter(
    (p) => p.supplier.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)
  );

  const updateItem = (idx: number, field: keyof PurchaseItem, value: string | number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'qty' || field === 'unitPrice') {
      items[idx].total = items[idx].qty * items[idx].unitPrice;
    }
    setForm({ ...form, items });
  };

  const addItem = () => {
    setActiveItemSuggestion(null);
    setForm({ ...form, items: [...form.items, { name: '', qty: 1, unitPrice: 0, total: 0 }] });
  };
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const formTotal = form.items.reduce((s, i) => s + i.total, 0);

  const openAdd = () => {
    setEditingPurchase(null);
    setForm(emptyForm);
    setPaidAmount(0);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setForm({ supplier: p.supplier, phone: p.phone, mode: p.mode, notes: p.notes, items: p.items.map(i => ({ ...i })) });
    setPaidAmount(p.paid);
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.supplier.trim()) e.supplier = 'Supplier name required';
    if (form.items.some(i => !i.name.trim())) e.items = 'All item names required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const total = formTotal;
    const paid = Math.min(paidAmount, total);
    const due = total - paid;
    const status = due === 0 ? 'Cash' : form.mode;
    const items = form.items.map(i => ({...i, productId: data.products.find(p => p.name.trim().toLowerCase() === i.name.trim().toLowerCase())?.id}));
    const payload = { supplier:form.supplier, phone:form.phone, items, total, paid, due, mode:status as 'Cash'|'UPI'|'Credit', notes:form.notes };
    if (editingPurchase) updatePurchase(editingPurchase.id, payload);
    else addPurchase(payload);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deletePurchase(id);
    setDeleteConfirm(null);
  };

  const totalDue = purchases.reduce((s, p) => s + p.due, 0);

  const exportPurchasePDF = () => {
    const escapeHtml = (value: unknown) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const rows = filtered.map((p, index) => {
      const itemRows = p.items.map(item => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="num">${item.qty}</td>
          <td class="num">₹${Number(item.unitPrice || 0).toLocaleString('en-IN')}</td>
          <td class="num">₹${Number(item.total || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      return `
        <tr class="purchase-row">
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(p.id)}</strong></td>
          <td>${escapeHtml(p.supplier)}${p.phone ? `<div class="muted">${escapeHtml(p.phone)}</div>` : ''}</td>
          <td>${escapeHtml(p.date)}</td>
          <td class="num">₹${Number(p.total || 0).toLocaleString('en-IN')}</td>
          <td class="num ${p.due > 0 ? 'due' : 'paid'}">${p.due > 0 ? '₹' + Number(p.due).toLocaleString('en-IN') : '—'}</td>
        </tr>
        <tr class="items-row">
          <td></td>
          <td colspan="5">
            <table class="items">
              <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Item Total</th></tr></thead>
              <tbody>${itemRows}</tbody>
            </table>
            ${p.notes ? `<div class="note">Note: ${escapeHtml(p.notes)}</div>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    const business = data.business;
    const logo = business.logoUrl
      ? `<img src="${escapeHtml(business.logoUrl)}" alt="" class="logo" />`
      : `<div class="logo text-logo">${escapeHtml((business.name || 'B').trim().charAt(0).toUpperCase())}</div>`;

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) {
      alert('Please allow pop-ups for this site to export the PDF.');
      return;
    }

    win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Purchase List - ${escapeHtml(business.name || 'Business')}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: #fff; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 18px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 46px; height: 46px; border-radius: 10px; object-fit: cover; border: 1px solid #e5e7eb; }
  .text-logo { display: flex; align-items: center; justify-content: center; background: #f3f4f6; font-size: 22px; font-weight: 700; }
  h1 { margin: 0 0 4px; font-size: 21px; color: #111827; }
  .business-meta, .muted { color: #6b7280; font-size: 10px; margin-top: 2px; }
  .report-title { text-align: right; }
  .report-title h2 { margin: 0 0 5px; font-size: 18px; }
  .summary { display: flex; gap: 28px; margin-bottom: 16px; }
  .summary span { color: #6b7280; }
  .summary strong { color: #111827; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; color: #374151; font-weight: 700; text-align: left; padding: 8px 7px; border: 1px solid #e5e7eb; }
  td { padding: 8px 7px; border: 1px solid #e5e7eb; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .due { color: #dc2626; font-weight: 700; }
  .paid { color: #059669; font-weight: 700; }
  .items-row td { border-top: 0; background: #fafafa; padding-top: 5px; padding-bottom: 10px; }
  .items { width: 75%; margin-left: 0; font-size: 10px; }
  .items th { padding: 5px; background: #fff; }
  .items td { padding: 5px; background: #fff; }
  .note { margin-top: 6px; color: #6b7280; font-style: italic; font-size: 10px; }
  .total { margin-top: 14px; margin-left: auto; width: 300px; }
  .total div { display: flex; justify-content: space-between; padding: 5px 0; }
  .grand { border-top: 2px solid #111827; font-size: 14px; font-weight: 700; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 9px; text-align: center; }
  @page { size: A4 portrait; margin: 12mm; }
  @media print { body { padding: 0; } .purchase-row { break-after: avoid; } .items-row { break-before: avoid; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${logo}
      <div>
        <h1>${escapeHtml(business.name || 'My Business')}</h1>
        ${business.address ? `<div class="business-meta">${escapeHtml(business.address)}</div>` : ''}
        ${business.mobile ? `<div class="business-meta">Mobile: ${escapeHtml(business.mobile)}</div>` : ''}
        ${business.gstNumber ? `<div class="business-meta">GSTIN: ${escapeHtml(business.gstNumber)}</div>` : ''}
      </div>
    </div>
    <div class="report-title">
      <h2>Purchase List</h2>
      <div class="business-meta">Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}</div>
      ${search ? `<div class="business-meta">Search: ${escapeHtml(search)}</div>` : ''}
    </div>
  </div>

  <div class="summary">
    <div><span>Purchases:</span> <strong>${filtered.length}</strong></div>
    <div><span>Total:</span> <strong>₹${filtered.reduce((s, p) => s + Number(p.total || 0), 0).toLocaleString('en-IN')}</strong></div>
    <div><span>Pending:</span> <strong>₹${filtered.reduce((s, p) => s + Number(p.due || 0), 0).toLocaleString('en-IN')}</strong></div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Purchase ID</th><th>Supplier</th><th>Date</th><th class="num">Total</th><th class="num">Due</th></tr></thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;padding:24px">No purchases found</td></tr>'}
    </tbody>
  </table>

  <div class="total">
    <div><span>Total Purchases</span><strong>₹${filtered.reduce((s, p) => s + Number(p.total || 0), 0).toLocaleString('en-IN')}</strong></div>
    <div><span>Total Paid</span><strong>₹${filtered.reduce((s, p) => s + Number(p.paid || 0), 0).toLocaleString('en-IN')}</strong></div>
    <div class="grand"><span>Total Due</span><span>₹${filtered.reduce((s, p) => s + Number(p.due || 0), 0).toLocaleString('en-IN')}</span></div>
  </div>

  <div class="footer">Purchase report · ${escapeHtml(business.name || 'Billing Hub')}</div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  if (!ready) return null;

  return (
    <AppLayout activePath="/purchases">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{purchases.length} purchases · ₹{totalDue.toLocaleString('en-IN')} pending payment</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportPurchasePDF}
              className="btn-secondary !px-3 !py-1.5 text-xs flex items-center gap-1.5"
              title="Export purchase list as PDF"
            >
              <FileDown size={14} />Export PDF
            </button>
            <button onClick={openAdd} className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1.5">
              <Plus size={14} />New Purchase
            </button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search purchases..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" />
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm mobile-data-table purchases-table">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Purchase ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Supplier</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Due</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />No purchases found</td></tr>
                )}
                {filtered.map((p) => (
                  <React.Fragment key={p.id}>
                    <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground">
                          {expandedRow === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.id}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.supplier}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                      <td className="px-4 py-3 text-right font-mono-nums">₹{p.total.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right"><span className={`font-mono-nums font-medium ${p.due > 0 ? 'text-red-600' : 'text-green-600'}`}>{p.due > 0 ? `₹${p.due.toLocaleString('en-IN')}` : '—'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === p.id && (
                      <tr className="bg-secondary/10">
                        <td colSpan={7} className="px-8 py-3">
                          <table className="w-full text-xs mobile-data-table purchase-items-table">
                            <thead><tr className="text-muted-foreground"><th className="text-left pb-1">Item</th><th className="text-right pb-1">Qty</th><th className="text-right pb-1">Unit Price</th><th className="text-right pb-1">Total</th></tr></thead>
                            <tbody>
                              {p.items.map((item, i) => (
                                <tr key={i}><td className="py-0.5">{item.name}</td><td className="text-right">{item.qty}</td><td className="text-right">₹{item.unitPrice}</td><td className="text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td></tr>
                              ))}
                            </tbody>
                          </table>
                          {p.notes && <p className="text-xs text-muted-foreground mt-2 italic">Note: {p.notes}</p>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-4 scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-semibold text-foreground">{editingPurchase ? 'Edit Purchase' : 'New Purchase'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier Name *</label>
                  <input className={`input-field ${errors.supplier ? 'border-red-400' : ''}`} placeholder="Supplier name" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
                  {errors.supplier && <p className="text-xs text-red-500 mt-1">{errors.supplier}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                  <input className="input-field" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Mode</label>
                  <select className="input-field" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as 'Cash' | 'UPI' | 'Credit' })}>
                    <option>Cash</option><option>UPI</option><option>Credit</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Items *</label>
                  <button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} />Add Item</button>
                </div>
                {errors.items && <p className="text-xs text-red-500 mb-2">{errors.items}</p>}
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 relative">
                        <input
                          className="input-field w-full"
                          placeholder="Item name"
                          value={item.name}
                          autoComplete="off"
                          onFocus={() => setActiveItemSuggestion(idx)}
                          onChange={(e) => {
                            updateItem(idx, 'name', e.target.value);
                            setActiveItemSuggestion(idx);
                          }}
                        />
                        {activeItemSuggestion === idx && productSuggestions(idx).length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-[70] bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                            {productSuggestions(idx).map(product => (
                              <button
                                key={product.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectProduct(idx, product)}
                                className="w-full text-left px-3 py-2.5 hover:bg-secondary/60 transition-colors border-b border-border last:border-0"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-foreground truncate">{product.name}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">₹{product.price.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">Stock: {product.stock} {product.unit}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input type="number" className="input-field col-span-2" placeholder="Qty" value={item.qty || ''} onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))} />
                      <input type="number" className="input-field col-span-3" placeholder="Price" value={item.unitPrice || ''} onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))} />
                      <button onClick={() => removeItem(idx)} className="col-span-1 p-1.5 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors" disabled={form.items.length === 1}><X size={14} /></button>
                      <div className="col-span-1 text-xs text-right text-muted-foreground font-mono-nums">₹{item.total}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-2 text-sm font-semibold text-foreground">Total: ₹{formTotal.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount Paid (₹)</label>
                <input type="number" className="input-field" placeholder="0" value={paidAmount || ''} onChange={(e) => setPaidAmount(Number(e.target.value))} max={formTotal} />
                <p className="text-xs text-muted-foreground mt-1">Due: ₹{Math.max(0, formTotal - paidAmount).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editingPurchase ? 'Save Changes' : 'Add Purchase'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 scale-in p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><Trash2 size={18} className="text-red-600" /></div>
              <div><h3 className="font-semibold text-foreground">Delete Purchase</h3><p className="text-sm text-muted-foreground">This action cannot be undone.</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
