'use client';

import React, { useEffect, useState } from 'react';
import InvoiceListPanel from './InvoiceListPanel';
import CreateInvoicePanel from './CreateInvoicePanel';
import ViewInvoicePanel from './ViewInvoicePanel';
import { useAppStore } from '@/lib/store';

export type InvoiceRecord = {
  id: string;
  customerId?: string;
  customer: string;
  phone: string;
  address: string;
  items: Array<{ name: string; sku: string; qty: number; unitPrice: number; total: number }>;
  subtotal: number;
  discount: number;
  discountType: 'flat' | 'percent';
  total: number;
  paid: number;
  due: number;
  mode: 'Cash' | 'UPI' | 'Credit';
  status: 'Paid' | 'Partial' | 'Credit';
  date: string;
  time: string;
  notes: string;
};

export type PanelMode = 'list' | 'create' | 'view';

// Invoice list comes directly from the shared store.

export default function InvoiceBillingScreen() {
  const [panelMode, setPanelMode] = useState<PanelMode>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const { data, ready, markActivityRead } = useAppStore();
  const invoices = data.invoices;
  useEffect(() => { if (ready) markActivityRead('invoice'); }, [ready, markActivityRead]);
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('invoice');
    const action = params.get('action');
    if (!invoiceId) return;
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    setSelectedInvoice(inv);
    setPanelMode('view');
    if (action === 'print') {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('sawariya:print-invoice', { detail: invoiceId })), 50);
    }
  }, [ready, invoices]);

  const handleViewInvoice = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setPanelMode('view');
  };

  const handleCreateNew = () => {
    setSelectedInvoice(null);
    setPanelMode('create');
  };

  const handleInvoiceSaved = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setPanelMode('view');
  };

  const handleBack = () => {
    setPanelMode('list');
    setSelectedInvoice(null);
  };

  if (!ready) return null;

  return (
    <div className="flex h-full min-h-[calc(100vh-56px)]">
      {/* Left: Invoice List — always visible on desktop, hidden on mobile when panel open */}
      <div className={`
        ${panelMode !== 'list' ? 'hidden xl:flex' : 'flex'}
        flex-col w-full xl:w-[420px] 2xl:w-[480px] xl:min-w-[380px]
        border-r border-border bg-card
      `}>
        <InvoiceListPanel
          invoices={invoices}
          selectedId={selectedInvoice?.id ?? null}
          onSelect={handleViewInvoice}
          onCreateNew={handleCreateNew}
        />
      </div>

      {/* Right: Create / View Panel */}
      {panelMode === 'create' && (
        <div className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto">
          <CreateInvoicePanel onSave={handleInvoiceSaved} onCancel={handleBack} />
        </div>
      )}

      {panelMode === 'view' && selectedInvoice && (
        <div className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto">
          <ViewInvoicePanel invoice={selectedInvoice} onBack={handleBack} onCreateNew={handleCreateNew} />
        </div>
      )}

      {panelMode === 'list' && (
        <div className="hidden xl:flex flex-1 items-center justify-center bg-secondary/30">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Select an invoice to view</p>
            <p className="text-sm text-muted-foreground mb-4">
              Or create a new bill for a customer
            </p>
            <button
              onClick={handleCreateNew}
              className="btn-primary px-5 py-2 text-sm"
            >
              + Create New Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}