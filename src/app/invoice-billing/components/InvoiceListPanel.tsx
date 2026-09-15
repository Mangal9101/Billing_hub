'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, ChevronDown } from 'lucide-react';
import type { InvoiceRecord } from './InvoiceBillingScreen';

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'Paid') return <span className="badge-paid">{status}</span>;
  if (status === 'Partial') return <span className="badge-partial">{status}</span>;
  if (status === 'Credit') return <span className="badge-credit">{status}</span>;
  return <span className="badge-draft">{status}</span>;
};

const PaymentBadge = ({ mode }: { mode: string }) => {
  if (mode === 'Cash') return <span className="payment-cash">{mode}</span>;
  if (mode === 'UPI') return <span className="payment-upi">{mode}</span>;
  return <span className="payment-credit">{mode}</span>;
};

interface Props {
  invoices: InvoiceRecord[];
  selectedId: string | null;
  onSelect: (inv: InvoiceRecord) => void;
  onCreateNew: () => void;
}

export default function InvoiceListPanel({ invoices, selectedId, onSelect, onCreateNew }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.customer.toLowerCase().includes(search.toLowerCase()) ||
        inv.id.toLowerCase().includes(search.toLowerCase()) ||
        inv.phone.includes(search);
      const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
      const matchMode = modeFilter === 'All' || inv.mode === modeFilter;
      const [dd, mm, yyyy] = (inv.date || '').split('/');
      const invoiceDate = yyyy && mm && dd ? `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}` : '';
      const matchFrom = !fromDate || (invoiceDate && invoiceDate >= fromDate);
      const matchTo = !toDate || (invoiceDate && invoiceDate <= toDate);
      return matchSearch && matchStatus && matchMode && matchFrom && matchTo;
    });
  }, [invoices, search, statusFilter, modeFilter, fromDate, toDate]);

  const totalDue = filtered.reduce((s, i) => s + i.due, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Invoices</h2>
            <p className="text-xs text-muted-foreground">{filtered.length} of {invoices.length} bills</p>
          </div>
          <button
            onClick={onCreateNew}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <Plus size={15} />
            New Bill
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer, phone, invoice ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Filter size={12} />
          Filters
          <ChevronDown size={12} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          {(statusFilter !== 'All' || modeFilter !== 'All' || fromDate || toDate) && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>

        {showFilters && (
          <div className="mt-2 space-y-2 slide-up">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-xs py-1.5">
                  {['All', 'Paid', 'Partial', 'Credit'].map((s) => <option key={`status-opt-${s}`} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Payment</label>
                <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="input-field text-xs py-1.5">
                  {['All', 'Cash', 'UPI', 'Credit'].map((m) => <option key={`mode-opt-${m}`} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field text-xs py-1.5" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field text-xs py-1.5" />
              </div>
            </div>
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-[10px] text-primary hover:underline">
                Clear date filter
              </button>
            )}
          </div>
        )}

        {/* Stats bar */}
        {totalDue > 0 && (
          <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-xs text-red-700">Total pending dues</span>
            <span className="font-mono-nums text-sm font-bold text-red-700">
              ₹{totalDue.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* Invoice list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <Search size={20} className="text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">No invoices found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          filtered.map((inv) => (
            <button
              key={inv.id}
              onClick={() => onSelect(inv)}
              className={`w-full text-left px-4 py-3.5 border-b border-border transition-colors
                ${selectedId === inv.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-secondary/50'}`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{inv.customer}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{inv.id}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                  <span className="font-mono-nums font-bold text-sm text-foreground">
                    ₹{inv.total.toLocaleString('en-IN')}
                  </span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PaymentBadge mode={inv.mode} />
                  <span className="text-xs text-muted-foreground">
                    {inv.items.length} item{inv.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {inv.due > 0 && (
                    <span className="text-xs font-mono-nums text-red-600 font-medium">
                      Due ₹{inv.due.toLocaleString('en-IN')}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono">{inv.time}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}