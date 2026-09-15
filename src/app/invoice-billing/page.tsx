import React from 'react';
import AppLayout from '@/components/AppLayout';
import InvoiceBillingScreen from './components/InvoiceBillingScreen';

export default function InvoiceBillingPage() {
  return (
    <AppLayout activePath="/invoice-billing">
      <InvoiceBillingScreen />
    </AppLayout>
  );
}