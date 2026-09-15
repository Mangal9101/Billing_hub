'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Printer } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'Paid') return <span className="badge-paid">Paid</span>;
  if (status === 'Partial') return <span className="badge-partial">Partial</span>;
  if (status === 'Credit') return <span className="badge-credit">Credit</span>;
  return <span className="badge-draft">{status}</span>;
};

const PaymentBadge = ({ mode }: { mode: string }) => {
  if (mode === 'Cash') return <span className="payment-cash">Cash</span>;
  if (mode === 'UPI') return <span className="payment-upi">UPI</span>;
  return <span className="payment-credit">Credit</span>;
};

export default function RecentInvoicesTable() {
  const {data,ready}=useAppStore();
  const router = useRouter();
  const recentInvoices=data.invoices.slice(0,8).map((i:any)=>({...i,items:i.items.map((x:any)=>`${x.name} ×${x.qty}`).join(', ')}));
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  if(!ready)return null;

  return (
    <div className="card border border-border">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent Invoices</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Today's billing activity</p>
        </div>
        <Link
          href="/invoice-billing"
          className="text-sm text-primary hover:underline font-medium"
        >
          View all →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm mobile-data-table invoices-table">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Items</th>
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Due</th>
              <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode</th>
              <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Time</th>
              <th className="px-3 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {recentInvoices.map((inv) => (
              <tr
                key={inv.id}
                onMouseEnter={() => setHoveredRow(inv.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
              >
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-primary font-medium">{inv.id}</span>
                </td>
                <td className="px-3 py-3">
                  <div>
                    <p className="font-medium text-foreground text-sm truncate max-w-[120px]">{inv.customer}</p>
                    <p className="text-xs text-muted-foreground font-mono">{inv.phone}</p>
                  </div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <p className="text-xs text-muted-foreground truncate max-w-[160px]">{inv.items}</p>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-mono-nums font-semibold text-foreground">
                    ₹{inv.total.toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="px-3 py-3 text-right hidden lg:table-cell">
                  {inv.due > 0 ? (
                    <span className="font-mono-nums text-sm font-medium text-red-600">
                      ₹{inv.due.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-green-600 text-sm">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <PaymentBadge mode={inv.mode} />
                </td>
                <td className="px-3 py-3 text-center">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-3 py-3 text-right hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground font-mono">{inv.time}</span>
                </td>
                <td className="px-3 py-3">
                  <div className={`flex items-center gap-1 justify-end transition-opacity duration-150 ${hoveredRow === inv.id ? 'opacity-100' : 'opacity-0'}`}>
                    <button onClick={() => router.push(`/invoice-billing?invoice=${encodeURIComponent(inv.id)}`)} className="p-1.5 rounded hover:bg-secondary transition-colors group relative" title="View invoice">
                      <Eye size={14} className="text-muted-foreground group-hover:text-foreground" />
                    </button>
                    <button onClick={() => router.push(`/invoice-billing?invoice=${encodeURIComponent(inv.id)}&action=print`)} className="p-1.5 rounded hover:bg-secondary transition-colors group relative" title="Print invoice">
                      <Printer size={14} className="text-muted-foreground group-hover:text-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}