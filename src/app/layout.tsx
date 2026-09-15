import React from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AppStoreProvider } from '@/lib/store';
import AuthGate from '@/components/AuthGate';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Billing Hub — Billing & Stock Management',
  description:
    'Billing Hub helps business owners create invoices, track stock, manage khata credit, and monitor daily sales from one dashboard.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className={dmSans.className}>
        <AppStoreProvider><AuthGate>{children}</AuthGate></AppStoreProvider>
        <Toaster position="bottom-right" richColors closeButton /></body>
    </html>
  );
}