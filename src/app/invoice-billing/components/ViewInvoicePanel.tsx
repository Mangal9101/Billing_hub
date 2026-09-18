'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Printer, ArrowLeft, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { InvoiceRecord } from './InvoiceBillingScreen';
import PrintInvoiceModal from './PrintInvoiceModal';
import { useAppStore } from '@/lib/store';

interface Props {
  invoice: InvoiceRecord;
  onBack: () => void;
  onCreateNew: () => void;
}

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'Paid') return (
    <span className="badge-paid flex items-center gap-1">
      <CheckCircle size={11} /> Paid
    </span>
  );
  if (status === 'Partial') return (
    <span className="badge-partial flex items-center gap-1">
      <Clock size={11} /> Partially Paid
    </span>
  );
  return (
    <span className="badge-credit flex items-center gap-1">
      <AlertCircle size={11} /> Credit / Due
    </span>
  );
};

const PaymentBadge = ({ mode }: { mode: string }) => {
  if (mode === 'Cash') return <span className="payment-cash">{mode}</span>;
  if (mode === 'UPI') return <span className="payment-upi">{mode}</span>;
  return <span className="payment-credit">{mode}</span>;
};

export default function ViewInvoicePanel({ invoice, onBack, onCreateNew }: Props) {
  const [showPrint, setShowPrint] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const { data, receivePayment } = useAppStore();
  const storedInvoice = data.invoices.find(i => i.id === invoice.id) || invoice;
  // Older invoices may not have customerId. Fall back to the customer name
  // so the current customer master phone/address are shown in billing too.
  const invoiceCustomer =
    (storedInvoice.customerId
      ? data.customers.find((c) => c.id === storedInvoice.customerId)
      : undefined) ||
    data.customers
      .filter((c) => c.name.trim().toLowerCase() === (storedInvoice.customer || '').trim().toLowerCase())
      [0];
  const liveInvoice = (invoiceCustomer
    ? { ...storedInvoice, customer: invoiceCustomer.name, phone: invoiceCustomer.phone || '', address: invoiceCustomer.address || '' }
    : storedInvoice) as InvoiceRecord;
  React.useEffect(() => {
    const handler = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id === liveInvoice.id) setShowPrint(true);
    };
    window.addEventListener('sawariya:print-invoice', handler);
    return () => window.removeEventListener('sawariya:print-invoice', handler);
  }, [liveInvoice.id]);

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (!liveInvoice.customerId) {
      toast.error('This invoice is not linked to a customer account');
      return;
    }
    receivePayment(liveInvoice.customerId, Math.min(parseFloat(paymentAmount), liveInvoice.due), `Payment received · ${liveInvoice.id}`);
    toast.success(`Payment of ₹${Math.min(parseFloat(paymentAmount), liveInvoice.due).toLocaleString('en-IN')} recorded`);
    setRecordingPayment(false);
    setPaymentAmount('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="invoice-view-header flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="xl:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Back to list"
          >
            <ArrowLeft size={16} className="text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground font-mono">{liveInvoice.id}</h2>
              <StatusBadge status={liveInvoice.status} />
            </div>
            <p className="text-xs text-muted-foreground">{liveInvoice.date} · {liveInvoice.time}</p>
          </div>
        </div>
        <div className="invoice-view-actions flex items-center gap-2">
          <button
            onClick={() => setShowPrint(true)}
            className="btn-secondary invoice-view-print flex items-center gap-1.5 text-sm py-2"
          >
            <Printer size={15} />
            Print
          </button>
          <button
            onClick={onCreateNew}
            className="btn-primary invoice-new-bill flex items-center gap-1.5 text-sm py-2"
          >
            <Plus size={15} />
            New Bill
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-6 py-5 max-w-2xl space-y-5">

          {/* Business information */}
          <div className="card border border-border p-4">
            <div className="flex items-center gap-3">
              {data.business.logoUrl ? (
                <img src={data.business.logoUrl} alt="Business logo" className="w-11 h-11 rounded-lg object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {(data.business.name?.[0] || 'S').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{data.business.name || 'My Business'}</p>
                {data.business.address && <p className="text-xs text-muted-foreground truncate">{data.business.address}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {data.business.mobile && <span>{data.business.mobile}</span>}
                  {data.business.gstNumber && <span>GSTIN: {data.business.gstNumber}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="card border border-border p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Customer</h3>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{liveInvoice.customer}</p>
                {liveInvoice.phone && (
                  <p className="text-sm text-muted-foreground font-mono mt-0.5">{liveInvoice.phone}</p>
                )}
                {liveInvoice.address && (
                  <p className="text-sm text-muted-foreground mt-0.5">{liveInvoice.address}</p>
                )}
              </div>
              <PaymentBadge mode={liveInvoice.mode} />
            </div>
          </div>

          {/* Line items */}
          <div className="card border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items Purchased</h3>
            </div>
            <table className="w-full text-sm mobile-data-table invoice-items-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Product</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Qty</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Unit Price</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {liveInvoice.items.map((item, idx) => (
                  <tr key={`view-item-${liveInvoice.id}-${idx}`} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono-nums text-foreground">{item.qty}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono-nums text-muted-foreground">₹{item.unitPrice.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono-nums font-semibold text-foreground">₹{item.total.toLocaleString('en-IN')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-border px-4 py-3 space-y-1.5 bg-secondary/20">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono-nums">₹{liveInvoice.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {liveInvoice.discount > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Discount {liveInvoice.discountType === 'percent' ? `(${liveInvoice.discount}%)` : ''}</span>
                  <span className="font-mono-nums">− ₹{liveInvoice.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 mt-1">
                <span>Grand Total</span>
                <span className="font-mono-nums text-lg">₹{liveInvoice.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className="card border border-border p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Payment Summary</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                <p className="font-mono-nums font-bold text-foreground">₹{liveInvoice.total.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-green-700 uppercase tracking-wider mb-1">Paid</p>
                <p className="font-mono-nums font-bold text-green-700">₹{liveInvoice.paid.toLocaleString('en-IN')}</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${liveInvoice.due > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-[10px] uppercase tracking-wider mb-1 ${liveInvoice.due > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  Due
                </p>
                <p className={`font-mono-nums font-bold ${liveInvoice.due > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  ₹{liveInvoice.due.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Record payment button for partial/credit */}
            {liveInvoice.due > 0 && !recordingPayment && (
              <button
                onClick={() => setRecordingPayment(true)}
                className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
              >
                <CheckCircle size={15} />
                Record Payment for ₹{liveInvoice.due.toLocaleString('en-IN')} Due
              </button>
            )}

            {recordingPayment && (
              <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30 slide-up">
                <p className="text-sm font-medium text-foreground">Record Payment</p>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Amount Received (₹) <span className="text-muted-foreground font-normal">— max ₹{liveInvoice.due.toLocaleString('en-IN')}</span>
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={liveInvoice.due.toString()}
                    max={liveInvoice.due}
                    min={1}
                    className="input-field text-sm font-mono-nums"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setRecordingPayment(false)} className="btn-secondary flex-1 text-sm py-2">
                    Cancel
                  </button>
                  <button onClick={handleRecordPayment} className="btn-primary flex-1 text-sm py-2">
                    Save Payment
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {liveInvoice.notes && (
            <div className="card border border-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</h3>
              <p className="text-sm text-foreground">{liveInvoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      {showPrint && (
        <PrintInvoiceModal invoice={liveInvoice} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}