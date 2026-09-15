'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const SalesTrendChart = dynamic(() => import('./SalesTrendChart'), { ssr: false });
const PaymentModeChart = dynamic(() => import('./PaymentModeChart'), { ssr: false });

export default function DashboardChartsRow() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const range = `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 2xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 2xl:col-span-3 card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Daily Sales — Last 7 Days</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Total billed amount in INR</p>
          </div>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
            {range}
          </span>
        </div>
        <SalesTrendChart />
      </div>
      <div className="xl:col-span-2 2xl:col-span-2 card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Payment Mode Split</h3>
            <p className="text-xs text-muted-foreground mt-0.5">This week's collection breakdown</p>
          </div>
        </div>
        <PaymentModeChart />
      </div>
    </div>
  );
}