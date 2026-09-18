'use client';
import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardKPIGrid from './components/DashboardKPIGrid';
import DashboardChartsRow from './components/DashboardChartsRow';
import RecentInvoicesTable from './components/RecentInvoicesTable';
import LowStockPanel from './components/LowStockPanel';

export default function DashboardPage() {
  return (
    <AppLayout activePath="/">
      <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Today — {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · IST
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Updated now
            </span>
          </div>
        </div>

        <DashboardKPIGrid />
        <DashboardChartsRow />

        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RecentInvoicesTable />
          </div>
          <div className="xl:col-span-1">
            <LowStockPanel />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}