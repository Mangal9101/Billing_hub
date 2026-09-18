'use client';

import React, { useRef } from 'react';
import { X, Printer, MessageCircle } from 'lucide-react';
import type { InvoiceRecord } from './InvoiceBillingScreen';
import { useAppStore } from '@/lib/store';

interface Props {
  invoice: InvoiceRecord;
  onClose: () => void;
}

export default function PrintInvoiceModal({ invoice, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data } = useAppStore();

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const cleanPhone = (invoice.phone || '').replace(/\D/g, '');
    const customer = invoice.customer || 'Walk-in Customer';
    const lines = [
      `*${data.business.name || 'My Business'}*`,
      `Invoice: ${invoice.id}`,
      `Date: ${invoice.date} ${invoice.time || ''}`.trim(),
      `Customer: ${customer}`,
      '',
      ...invoice.items.map(
        (item, index) =>
          `${index + 1}. ${item.name} × ${item.qty} = ₹${item.total.toLocaleString('en-IN')}`,
      ),
      '',
      `*Grand Total: ₹${invoice.total.toLocaleString('en-IN')}*`,
      `Paid: ₹${invoice.paid.toLocaleString('en-IN')}`,
      `Due: ₹${invoice.due.toLocaleString('en-IN')}`,
    ];

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`
      : `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 z-50 flex items-center justify-center p-4 fade-in">
      <div className="bg-card rounded-xl shadow-modal w-full max-w-lg max-h-[90vh] flex flex-col scale-in">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border no-print">
          <h3 className="font-semibold text-foreground">Print Invoice</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="btn-secondary invoice-whatsapp-btn flex items-center gap-1.5 text-sm py-2"
              title="Share invoice on WhatsApp"
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary invoice-print-btn flex items-center gap-1.5 text-sm py-2"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Close"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Invoice preview */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          <div ref={printRef} className="invoice-print-area bg-white rounded-lg border border-border p-6 text-sm">
            {/* Shop header */}
            <div className="text-center mb-5 pb-4 border-b border-border">
              <div className="flex items-center justify-center gap-2">
                {data.business.logoUrl && (
                  <img src={data.business.logoUrl} alt="Business logo" className="w-10 h-10 rounded object-cover" />
                )}
                <h1 className="text-xl font-bold text-foreground">{data.business.name || 'My Business'}</h1>
              </div>
              {data.business.address && <p className="text-xs text-muted-foreground mt-1">{data.business.address}</p>}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-0.5">
                {data.business.mobile && <p className="text-xs text-muted-foreground">Mob: {data.business.mobile}</p>}
                {data.business.gstNumber && <p className="text-xs text-muted-foreground">GSTIN: {data.business.gstNumber}</p>}
              </div>
            </div>

            {/* Invoice meta */}
            <div className="flex justify-between mb-5">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Bill To</p>
                <p className="font-semibold text-foreground">{invoice.customer || 'Walk-in Customer'}</p>
                {invoice.phone && <p className="text-xs text-muted-foreground font-mono">{invoice.phone}</p>}
                {invoice.address && <p className="text-xs text-muted-foreground">{invoice.address}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Invoice</p>
                <p className="font-mono text-sm font-semibold text-foreground">{invoice.id}</p>
                <p className="text-xs text-muted-foreground">{invoice.date}</p>
                <p className="text-xs text-muted-foreground">{invoice.time} IST</p>
              </div>
            </div>

            {/* Items table */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b-2 border-foreground/20">
                  <th className="text-left py-2 text-xs font-semibold text-foreground">#</th>
                  <th className="text-left py-2 text-xs font-semibold text-foreground">Item</th>
                  <th className="text-center py-2 text-xs font-semibold text-foreground">Qty</th>
                  <th className="text-right py-2 text-xs font-semibold text-foreground">Rate</th>
                  <th className="text-right py-2 text-xs font-semibold text-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={`print-item-${invoice.id}-${idx}`} className="border-b border-border/50">
                    <td className="py-2 text-muted-foreground text-xs">{idx + 1}</td>
                    <td className="py-2">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>
                    </td>
                    <td className="py-2 text-center font-mono-nums">{item.qty}</td>
                    <td className="py-2 text-right font-mono-nums text-muted-foreground">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="py-2 text-right font-mono-nums font-medium">₹{item.total.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-border pt-3 space-y-1.5 mb-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono-nums">₹{invoice.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-xs text-green-700">
                  <span>Discount</span>
                  <span className="font-mono-nums">− ₹{invoice.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                <span>Grand Total</span>
                <span className="font-mono-nums">₹{invoice.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Amount Paid ({invoice.mode})</span>
                <span className="font-mono-nums">₹{invoice.paid.toLocaleString('en-IN')}</span>
              </div>
              {invoice.due > 0 && (
                <div className="flex justify-between text-sm font-semibold text-red-700">
                  <span>Balance Due</span>
                  <span className="font-mono-nums">₹{invoice.due.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-3 text-center">
              <p className="text-xs text-muted-foreground">Thank you for your purchase!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Goods once sold will not be taken back
              </p>
              {invoice.notes && (
                <p className="text-xs text-foreground mt-2 italic">{invoice.notes}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}