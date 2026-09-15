'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useAppStore } from '@/lib/store';

interface AppLayoutProps {
  children: React.ReactNode;
  activePath: string;
}

export default function AppLayout({ children, activePath }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data } = useAppStore();
  const businessName = data.business.name || 'My Business';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-30 lg:hidden fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        activePath={activePath}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center overflow-hidden">
              {data.business.logoUrl ? <img src={data.business.logoUrl} alt="Business logo" className="w-full h-full object-cover" /> : <span className="text-primary-foreground text-xs font-bold">{businessName.charAt(0).toUpperCase()}</span>}
            </div>
            <span className="font-semibold text-sm text-foreground truncate">{businessName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}