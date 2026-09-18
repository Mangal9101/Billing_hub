'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Plus,
  Search,
  BookOpen,
  X,
  ChevronUp,
  Bell,
  BellRing,
  MessageCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

type Reminder = {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  amount: number;
  date: string;
  note: string;
  completed: boolean;
  createdAt: string;
};

const REMINDER_STORAGE_KEY = 'billing_hub_khatabook_reminders_v1';

function formatDateForInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatReminderDate(value: string) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function KhatabookPage() {
  const {
    data,
    ready,
    addCustomer,
    addKhataEntry,
    receivePayment,
    markActivityRead,
  } = useAppStore();

  React.useEffect(() => {
    if (ready) markActivityRead('khatabook');
  }, [ready, markActivityRead]);

  const [search, setSearch] = useState('');
  const [selectedCustomerPage, setSelectedCustomerPage] = useState<string | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');

  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    customer: '',
    phone: '',
    amount: '',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Reminder state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderAccount, setReminderAccount] = useState<any | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [notificationStatus, setNotificationStatus] = useState('');
  const [reminderLoaded, setReminderLoaded] = useState(false);

  const accounts = data.customers
    .map((c) => ({
      id: c.id,
      customer: c.name,
      phone: c.phone,
      balance: c.outstanding,
      advance: c.advance || 0,
      lastActivity: c.lastVisit,
      entries: data.ledger
        .filter((e) => e.customerId === c.id)
        .map((e) => ({
          id: e.id,
          date: e.date,
          description: e.description,
          debit: e.debit,
          credit: e.credit,
        })),
    }))
    .filter((a) => Number(a.balance || 0) > 0 || Number(a.advance || 0) > 0 || a.entries.length > 0);

  const filtered = accounts.filter(
    (a) =>
      a.customer.toLowerCase().includes(search.toLowerCase()) ||
      a.phone.includes(search)
  );

  // Positive balance = customer se lena hai. Negative balance = customer ka advance.
  const totalOutstanding = accounts.reduce((s, a) => s + Math.max(Number(a.balance || 0), 0), 0);
  const totalAdvance = accounts.reduce((s, a) => s + Math.max(Number(a.advance || 0), 0), 0);

  /*
   * Reminders are stored per browser. They are scoped to the active
   * Billing Hub account/business when possible so one account does not
   * display another account's reminders.
   */
  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setReminders(parsed);
      }
    } catch {
      setReminders([]);
    }

    setReminderLoaded(true);
  }, [ready]);

  useEffect(() => {
    if (!reminderLoaded || typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        REMINDER_STORAGE_KEY,
        JSON.stringify(reminders)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [reminders, reminderLoaded]);

  const today = formatDateForInput(new Date());

  const activeReminders = useMemo(
    () => reminders.filter((r) => !r.completed),
    [reminders]
  );

  const dueTodayReminders = useMemo(
    () =>
      activeReminders.filter(
        (r) => r.date <= today
      ),
    [activeReminders, today]
  );

  const upcomingReminders = useMemo(
    () =>
      activeReminders
        .filter((r) => r.date > today)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [activeReminders, today]
  );

  const openPayment = (account: any) => {
    setSelectedAccount(account);
    setPaymentAmount('');
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const openCredit = (account: any) => {
    setSelectedAccount(account);
    setCreditAmount('');
    setCreditNote('');
    setShowCreditModal(true);
  };

  const handlePayment = () => {
    if (!selectedAccount) return;

    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) return;

    receivePayment(
      selectedAccount.id,
      amount,
      paymentNote || 'Payment received'
    );

    /*
     * If a payment is received for a customer, any reminder whose
     * amount is now fully covered can be marked completed manually
     * from the reminder card. We do not silently delete reminders.
     */
    setShowPaymentModal(false);
  };

  const handleCredit = () => {
    if (!selectedAccount) return;

    const amount = Number(creditAmount);

    if (!amount || amount <= 0) return;

    // Credit increases the customer's due balance.
    // If an advance already exists (negative balance), the store's
    // outstanding balance naturally nets that advance against this credit.
    addKhataEntry(
      selectedAccount.id,
      amount,
      creditNote || 'Credit added'
    );

    setShowCreditModal(false);
  };

  const openCustomerPage = (account: any) => {
    setSelectedCustomerPage(account.id);

    if (typeof window !== 'undefined') {
      window.history.pushState(
        { customerId: account.id },
        '',
        `/khatabook?customer=${encodeURIComponent(account.id)}`
      );
    }
  };

  const closeCustomerPage = () => {
    setSelectedCustomerPage(null);

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/khatabook');
    }
  };

  const openReminder = (account: any) => {
    setReminderAccount(account);
    setReminderDate(today);
    setReminderAmount(
      account.balance > 0 ? String(account.balance) : ''
    );
    setReminderNote('Payment Date');
    setShowReminderModal(true);
  };

  const saveReminder = () => {
    if (!reminderAccount) return;

    const amount = Number(reminderAmount);

    if (!reminderDate || !amount || amount <= 0) return;

    const reminder: Reminder = {
      id: `REM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      customerId: reminderAccount.id,
      customerName: reminderAccount.customer,
      phone: reminderAccount.phone,
      amount,
      date: reminderDate,
      note: reminderNote.trim() || 'Payment reminder',
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setReminders((prev) => [reminder, ...prev]);
    setShowReminderModal(false);
  };

  const completeReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, completed: true } : r
      )
    );
  };

  const deleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const requestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationStatus(
        'Browser notifications are not supported in this browser.'
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        setNotificationStatus('Notifications enabled.');

        if (dueTodayReminders.length > 0) {
          new Notification('Billing Hub — Payment Reminder', {
            body: `${dueTodayReminders.length} payment reminder${dueTodayReminders.length > 1 ? 's' : ''} due today.`,
          });
        }
      } else {
        setNotificationStatus(
          'Notification permission was not allowed.'
        );
      }
    } catch {
      setNotificationStatus(
        'Could not enable browser notifications.'
      );
    }
  };

  /*
   * When the owner opens Billing Hub on the reminder date, notify them.
   * A web page cannot reliably wake a completely closed browser by itself;
   * for that a server-side push/cron service is required. This client-side
   * notification covers the normal case when Billing Hub is open.
   */
  useEffect(() => {
    if (!reminderLoaded || typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (dueTodayReminders.length === 0) return;

    const notifiedKey = `billing_hub_reminders_notified_${today}`;

    if (sessionStorage.getItem(notifiedKey) === '1') return;

    const first = dueTodayReminders[0];

    try {
      new Notification('Billing Hub — Payment Due Today', {
        body:
          dueTodayReminders.length === 1
            ? `${first.customerName} — ₹${first.amount.toLocaleString('en-IN')} Payment due today.`
            : `${dueTodayReminders.length} customer payments are due today.`,
      });

      sessionStorage.setItem(notifiedKey, '1');
    } catch {
      // Ignore browser notification errors.
    }
  }, [reminderLoaded, dueTodayReminders, today]);

  const openWhatsAppReminder = (reminder: Reminder) => {
    const phone = reminder.phone.replace(/\D/g, '');

    if (!phone) return;

    const normalizedPhone =
      phone.length === 10 ? `91${phone}` : phone;

    const businessName =
      (data as any)?.business?.name ||
      (data as any)?.company?.name ||
      'Billing Hub';

    const message =
      `Hello ${reminder.customerName},\n\n` +
      `A payment of ₹${reminder.amount.toLocaleString('en-IN')} is due on your account.` +
      `\nPayment was scheduled for ${formatReminderDate(reminder.date)}.` +
      `\n\nPlease make the payment.\n\n` +
      `— ${businessName}`;

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const validateNewAccount = () => {
    const e: any = {};

    if (!newAccount.customer.trim()) {
      e.customer = 'Customer name required';
    }

    if (!newAccount.phone.trim()) {
      e.phone = 'Phone required';
    }

    if (!newAccount.amount || Number(newAccount.amount) <= 0) {
      e.amount = 'Amount must be greater than 0';
    }

    if (!newAccount.description.trim()) {
      e.description = 'Description required';
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  const handleAddAccount = () => {
    if (!validateNewAccount()) return;

    const c = addCustomer({
      name: newAccount.customer.trim(),
      phone: newAccount.phone.trim(),
      address: '',
    });

    addKhataEntry(
      c.id,
      Number(newAccount.amount),
      newAccount.description.trim()
    );

    setShowAddModal(false);

    setNewAccount({
      customer: '',
      phone: '',
      amount: '',
      description: '',
    });

    setErrors({});
  };

  if (!ready) return null;

  return (
    <AppLayout activePath="/khatabook">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        {selectedCustomerPage
          ? (() => {
              const customer = accounts.find(
                (a) => a.id === selectedCustomerPage
              );

              if (!customer) {
                return (
                  <div className="card p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      Customer not found
                    </p>

                    <button
                      onClick={closeCustomerPage}
                      className="btn-secondary"
                    >
                      Back to Khatabook
                    </button>
                  </div>
                );
              }

              // Store now keeps Due and Advance separately.
              const totalDue = Math.max(Number(customer.balance || 0), 0);
              const advanceAmount = Math.max(Number(customer.advance || 0), 0);

              const customerReminders = activeReminders
                .filter(
                  (r) => r.customerId === customer.id
                )
                .sort((a, b) =>
                  a.date.localeCompare(b.date)
                );

              return (
                <div className="space-y-5 pb-24">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeCustomerPage}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                      aria-label="Back to Khatabook"
                    >
                      <ChevronUp
                        size={20}
                        className="rotate-[-90deg]"
                      />
                    </button>

                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold text-foreground">
                        Customer Account
                      </h1>

                      <p className="text-sm text-muted-foreground mt-0.5">
                        Complete khata details
                      </p>
                    </div>
                  </div>

                  <div className="card p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-xl">
                          {customer.customer
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-xl font-bold text-foreground truncate">
                          {customer.customer}
                        </h2>

                        <p className="text-sm text-muted-foreground">
                          {customer.phone}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div
                        className={`rounded-xl border p-5 ${
                          totalDue > 0
                            ? 'border-red-200 bg-red-50/40'
                            : advanceAmount > 0
                              ? 'border-green-200 bg-green-50/40'
                              : 'border-border bg-secondary/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {totalDue > 0
                                ? 'Total Payment Due'
                                : advanceAmount > 0
                                  ? 'Advance Payment'
                                  : 'Account Balance'}
                            </p>

                            <p
                              className={`text-3xl font-bold ${
                                totalDue > 0
                                  ? 'text-red-600'
                                  : advanceAmount > 0
                                    ? 'text-green-600'
                                    : 'text-foreground'
                              }`}
                            >
                              ₹
                              {(
                                totalDue > 0
                                  ? totalDue
                                  : advanceAmount > 0
                                    ? advanceAmount
                                    : 0
                              ).toLocaleString('en-IN')}
                            </p>

                            <p
                              className={`text-sm font-semibold mt-1 ${
                                totalDue > 0
                                  ? 'text-red-600'
                                  : advanceAmount > 0
                                    ? 'text-green-600'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {totalDue > 0
                                ? 'Payment Due'
                                : advanceAmount > 0
                                  ? 'Advance Available'
                                  : 'Account Cleared'}
                            </p>
                          </div>

                          <div
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                              totalDue > 0
                                ? 'bg-red-100 text-red-700'
                                : advanceAmount > 0
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {totalDue > 0
                              ? 'DUE'
                              : advanceAmount > 0
                                ? 'ADVANCE'
                                : 'CLEARED'}
                          </div>
                        </div>

                        {advanceAmount > 0 && (
                          <p className="text-xs text-green-700 mt-3">
                            Customer ke account me ₹
                            {advanceAmount.toLocaleString('en-IN')}{' '}
                            advance available hai. Agla credit isi
                            This amount will be adjusted against future credit.
                          </p>
                        )}

                        {totalDue > 0 && advanceAmount === 0 && (
                          <p className="text-xs text-red-700/80 mt-3">
                            Customer currently has ₹
                            {totalDue.toLocaleString('en-IN')}{' '}
                            lena hai.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() =>
                          openReminder(customer)
                        }
                        disabled={totalDue <= 0}
                        className="btn-secondary flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <BellRing size={16} />
                        Set Reminder
                      </button>

                      {customerReminders.length > 0 && (
                        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/5 text-primary text-sm font-medium">
                          <Bell size={15} />
                          {customerReminders.length} active reminder
                          {customerReminders.length > 1
                            ? 's'
                            : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {customerReminders.length > 0 && (
                    <div className="card overflow-hidden">
                      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Payment Reminders
                          </p>

                          <p className="text-xs text-muted-foreground mt-1">
                            Customer ne jis date payment dene ka bola hai
                          </p>
                        </div>

                        <Bell
                          size={17}
                          className="text-primary"
                        />
                      </div>

                      <div className="p-4 space-y-3">
                        {customerReminders.map((reminder) => {
                          const isDue =
                            reminder.date <= today;

                          return (
                            <div
                              key={reminder.id}
                              className={`rounded-xl border p-4 ${
                                isDue
                                  ? 'border-red-200 bg-red-50/60'
                                  : 'border-border bg-secondary/20'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {isDue ? (
                                      <BellRing
                                        size={16}
                                        className="text-red-600 flex-shrink-0"
                                      />
                                    ) : (
                                      <Clock3
                                        size={16}
                                        className="text-primary flex-shrink-0"
                                      />
                                    )}

                                    <p
                                      className={`font-semibold ${
                                        isDue
                                          ? 'text-red-700'
                                          : 'text-foreground'
                                      }`}
                                    >
                                      ₹
                                      {reminder.amount.toLocaleString(
                                        'en-IN'
                                      )}
                                    </p>
                                  </div>

                                  <p className="text-xs text-muted-foreground mt-1">
                                    {isDue
                                      ? 'Payment due today / Overdue'
                                      : `Payment date: ${formatReminderDate(
                                          reminder.date
                                        )}`}
                                  </p>

                                  {reminder.note && (
                                    <p className="text-sm text-foreground mt-2">
                                      {reminder.note}
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={() =>
                                    deleteReminder(reminder.id)
                                  }
                                  className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600"
                                  title="Delete reminder"
                                >
                                  <X size={15} />
                                </button>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    openWhatsAppReminder(
                                      reminder
                                    )
                                  }
                                  className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-green-700"
                                >
                                  <MessageCircle size={14} />
                                  WhatsApp
                                </button>

                                <button
                                  onClick={() =>
                                    completeReminder(
                                      reminder.id
                                    )
                                  }
                                  className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
                                >
                                  <CheckCircle2 size={14} />
                                  Mark Completed
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Transaction History
                      </p>
                    </div>

                    <div className="px-5 py-4 space-y-3">
                      {customer.entries.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-5">
                          No transactions yet
                        </p>
                      )}

                      {customer.entries.map((entry: any) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">
                              {entry.description}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {entry.date}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            {entry.debit > 0 && (
                              <p className="text-red-600 font-mono-nums font-semibold">
                                -₹
                                {entry.debit.toLocaleString(
                                  'en-IN'
                                )}
                              </p>
                            )}

                            {entry.credit > 0 && (
                              <p className="text-green-600 font-mono-nums font-semibold">
                                +₹
                                {entry.credit.toLocaleString(
                                  'en-IN'
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-t border-border px-3 sm:px-4 py-2.5 sm:py-3">
                    <div className="max-w-screen-2xl mx-auto flex flex-row gap-2 sm:gap-3 sm:justify-end">
                      <button
                        onClick={() => openCredit(customer)}
                        className="btn-secondary flex-1 sm:flex-none sm:min-w-[140px] py-2.5 sm:py-3 px-4 sm:px-6 font-semibold text-sm sm:text-base"
                      >
                        Credit
                      </button>

                      <button
                        onClick={() => openPayment(customer)}
                        className="btn-primary flex-1 sm:flex-none sm:min-w-[140px] py-2.5 sm:py-3 px-4 sm:px-6 font-semibold text-sm sm:text-base"
                      >
                        Received
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Khatabook
                  </h1>

                  <p className="text-sm text-muted-foreground mt-0.5">
                    {accounts.length} accounts · ₹{totalOutstanding.toLocaleString('en-IN')} outstanding · ₹{totalAdvance.toLocaleString('en-IN')} advance
                  </p>
                </div>

                <button
                  onClick={() => {
                    setNewAccount({
                      customer: '',
                      phone: '',
                      amount: '',
                      description: '',
                    });
                    setErrors({});
                    setShowAddModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  New Khata
                </button>
              </div>

              {/* Reminder notification permission */}
              <div className="card border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Bell size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Payment Reminders
                      </p>

                      <p className="text-xs text-muted-foreground mt-0.5">
                        Set the customer's promised payment date. Billing Hub will show a reminder to the owner on the due date.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={requestNotifications}
                    className="btn-secondary flex items-center justify-center gap-2 text-xs whitespace-nowrap"
                  >
                    <BellRing size={14} />
                    Enable Notifications
                  </button>
                </div>

                {notificationStatus && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {notificationStatus}
                  </p>
                )}
              </div>

              {/* Due / upcoming reminder summary */}
              {activeReminders.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className={`card p-4 ${
                      dueTodayReminders.length > 0
                        ? 'border-red-200 bg-red-50/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Due Today / Overdue
                        </p>

                        <p
                          className={`text-2xl font-bold ${
                            dueTodayReminders.length > 0
                              ? 'text-red-600'
                              : 'text-foreground'
                          }`}
                        >
                          {dueTodayReminders.length}
                        </p>
                      </div>

                      <BellRing
                        size={22}
                        className={
                          dueTodayReminders.length > 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        }
                      />
                    </div>
                  </div>

                  <div className="card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Upcoming Reminders
                        </p>

                        <p className="text-2xl font-bold text-foreground">
                          {upcomingReminders.length}
                        </p>
                      </div>

                      <CalendarDays
                        size={22}
                        className="text-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Today's reminders */}
              {dueTodayReminders.length > 0 && (
                <div className="card overflow-hidden border-red-200">
                  <div className="px-5 py-4 border-b border-red-100 bg-red-50/60 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-red-700">
                        🔔 Payment lena hai aaj
                      </p>

                      <p className="text-xs text-red-600/80 mt-0.5">
                        {dueTodayReminders.length} payment reminder
                        {dueTodayReminders.length > 1
                          ? 's'
                          : ''}{' '}
                        due today / overdue
                      </p>
                    </div>

                    <BellRing
                      size={18}
                      className="text-red-600"
                    />
                  </div>

                  <div className="p-4 space-y-3">
                    {dueTodayReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="rounded-xl border border-red-100 bg-red-50/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const account = accounts.find(
                                (a) =>
                                  a.id ===
                                  reminder.customerId
                              );

                              if (account) {
                                openCustomerPage(account);
                              }
                            }}
                            className="text-left min-w-0"
                          >
                            <p className="font-semibold text-foreground">
                              {reminder.customerName}
                            </p>

                            <p className="text-xs text-muted-foreground mt-0.5">
                              {reminder.phone}
                            </p>

                            <p className="text-lg font-bold text-red-600 mt-2">
                              ₹
                              {reminder.amount.toLocaleString(
                                'en-IN'
                              )}
                            </p>

                            <p className="text-xs text-red-600 mt-0.5">
                              {reminder.date < today
                                ? `Overdue · ${formatReminderDate(
                                    reminder.date
                                  )}`
                                : 'Payment lena hai aaj'}
                            </p>

                            {reminder.note && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {reminder.note}
                              </p>
                            )}
                          </button>

                          <button
                            onClick={() =>
                              deleteReminder(reminder.id)
                            }
                            className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600"
                            title="Delete reminder"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              openWhatsAppReminder(reminder)
                            }
                            className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-green-700"
                          >
                            <MessageCircle size={14} />
                            WhatsApp Reminder
                          </button>

                          <button
                            onClick={() =>
                              completeReminder(reminder.id)
                            }
                            className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={14} />
                            Received / Complete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">₹{totalOutstanding.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-red-600/80 mt-1">Customer se lena hai</p>
                </div>

                <div className="card p-4 border-green-200 bg-green-50/30">
                  <p className="text-xs text-muted-foreground mb-1">Advance Received</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalAdvance.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-green-600/80 mt-1">This amount will be adjusted against future credit.</p>
                </div>

                <div className="card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Active Accounts</p>
                  <p className="text-2xl font-bold text-foreground">{accounts.filter((a) => Number(a.balance || 0) > 0).length}</p>
                </div>

                <div className="card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Cleared Accounts</p>
                  <p className="text-2xl font-bold text-green-600">{accounts.filter((a) => Number(a.balance || 0) === 0 && Number(a.advance || 0) === 0).length}</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative max-w-sm">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  className="input-field pl-9"
                />
              </div>

              {/* Accounts List */}
              <div className="space-y-3">
                {filtered.length === 0 && (
                  <div className="card p-12 text-center text-muted-foreground">
                    <BookOpen
                      size={32}
                      className="mx-auto mb-2 opacity-30"
                    />
                    No khata accounts found
                  </div>
                )}

                {filtered.map((account) => {
                  const customerReminderCount =
                    activeReminders.filter(
                      (r) =>
                        r.customerId === account.id
                    ).length;

                  return (
                    <div
                      key={account.id}
                      className="card overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openCustomerPage(account)
                        }
                        className="w-full text-left flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-semibold text-sm">
                              {account.customer.charAt(0)}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">
                                {account.customer}
                              </p>

                              {customerReminderCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex-shrink-0">
                                  <Bell size={10} />
                                  {customerReminderCount}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground truncate">
                              {account.phone} · Last:{' '}
                              {account.lastActivity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-3">
                          {Number(account.balance || 0) > 0 ? (
                            <>
                              <p className="text-xs text-muted-foreground">Balance Due</p>
                              <p className="text-lg font-bold text-red-600">
                                ₹{Number(account.balance).toLocaleString('en-IN')}
                              </p>
                            </>
                          ) : Number(account.advance || 0) > 0 ? (
                            <>
                              <p className="text-xs text-muted-foreground">Advance</p>
                              <p className="text-lg font-bold text-green-600">
                                ₹{Number(account.advance).toLocaleString('en-IN')}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground">Balance</p>
                              <p className="text-lg font-bold text-green-600">Cleared</p>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        {/* Payment Modal */}
        {showPaymentModal && selectedAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 scale-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Collect Payment
                </h2>

                <button
                  onClick={() =>
                    setShowPaymentModal(false)
                  }
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X
                    size={18}
                    className="text-muted-foreground"
                  />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground">
                    {selectedAccount.customer}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {selectedAccount.balance > 0
                      ? 'Outstanding: '
                      : selectedAccount.balance < 0
                        ? 'Advance available: '
                        : 'Current balance: '}
                    <span
                      className={`font-semibold ${
                        selectedAccount.balance > 0
                          ? 'text-red-600'
                          : selectedAccount.balance < 0
                            ? 'text-green-600'
                            : 'text-foreground'
                      }`}
                    >
                      ₹
                      {Math.abs(
                        selectedAccount.balance
                      ).toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Amount Received (₹) *
                  </label>

                  <input
                    type="number"
                    className="input-field"
                    placeholder="0"
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(
                        e.target.value
                      )
                    }
                    min="1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Due se zyada payment lene par extra amount automatically Advance Received me chala jayega.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Note
                  </label>

                  <input
                    className="input-field"
                    placeholder="e.g. Cash payment received"
                    value={paymentNote}
                    onChange={(e) =>
                      setPaymentNote(
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() =>
                    setShowPaymentModal(false)
                  }
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  onClick={handlePayment}
                  className="btn-primary"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Credit Modal */}
        {showCreditModal && selectedAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 scale-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Add Credit
                </h2>

                <button
                  onClick={() =>
                    setShowCreditModal(false)
                  }
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X
                    size={18}
                    className="text-muted-foreground"
                  />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground">
                    {selectedAccount.customer}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Current due:{' '}
                    <span className="text-red-600 font-semibold">
                      ₹
                      {selectedAccount.balance.toLocaleString(
                        'en-IN'
                      )}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Credit Amount (₹) *
                  </label>

                  <input
                    type="number"
                    className="input-field"
                    placeholder="0"
                    value={creditAmount}
                    onChange={(e) =>
                      setCreditAmount(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Note
                  </label>

                  <input
                    className="input-field"
                    placeholder="e.g. Credit sale"
                    value={creditNote}
                    onChange={(e) =>
                      setCreditNote(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() =>
                    setShowCreditModal(false)
                  }
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCredit}
                  className="btn-primary"
                >
                  Add Credit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reminder Modal */}
        {showReminderModal && reminderAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in p-4">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-sm scale-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Set Payment Reminder
                  </h2>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {reminderAccount.customer}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowReminderModal(false)
                  }
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X
                    size={18}
                    className="text-muted-foreground"
                  />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                  <p className="text-xs text-muted-foreground">
                    Current due
                  </p>

                  <p className="text-xl font-bold text-red-600">
                    ₹
                    {reminderAccount.balance.toLocaleString(
                      'en-IN'
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Payment Reminder Date *
                  </label>

                  <input
                    type="date"
                    className="input-field"
                    value={reminderDate}
                    min={today}
                    onChange={(e) =>
                      setReminderDate(
                        e.target.value
                      )
                    }
                  />

                  <p className="text-[11px] text-muted-foreground mt-1">
                    Example: If the customer says “I will pay on the 25th,” select the 25th as the payment date.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Reminder Amount (₹) *
                  </label>

                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="1000"
                    value={reminderAmount}
                    onChange={(e) =>
                      setReminderAmount(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Note
                  </label>

                  <input
                    className="input-field"
                    placeholder="e.g. Payment scheduled for 25th"
                    value={reminderNote}
                    onChange={(e) =>
                      setReminderNote(
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() =>
                    setShowReminderModal(false)
                  }
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  onClick={saveReminder}
                  className="btn-primary flex items-center gap-2"
                >
                  <Bell size={15} />
                  Save Reminder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Khata Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in p-4">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4 scale-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  New Khata Entry
                </h2>

                <button
                  onClick={() =>
                    setShowAddModal(false)
                  }
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X
                    size={18}
                    className="text-muted-foreground"
                  />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Customer Name *
                  </label>

                  <input
                    className={`input-field ${
                      errors.customer
                        ? 'border-red-400'
                        : ''
                    }`}
                    placeholder="Full name"
                    value={newAccount.customer}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        customer:
                          e.target.value,
                      })
                    }
                  />

                  {errors.customer && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.customer}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Phone *
                  </label>

                  <input
                    className={`input-field ${
                      errors.phone
                        ? 'border-red-400'
                        : ''
                    }`}
                    placeholder="10-digit phone"
                    value={newAccount.phone}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        phone: e.target.value,
                      })
                    }
                  />

                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Amount Due (₹) *
                  </label>

                  <input
                    type="number"
                    className={`input-field ${
                      errors.amount
                        ? 'border-red-400'
                        : ''
                    }`}
                    placeholder="0"
                    value={newAccount.amount}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        amount: e.target.value,
                      })
                    }
                  />

                  {errors.amount && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Description *
                  </label>

                  <input
                    className={`input-field ${
                      errors.description
                        ? 'border-red-400'
                        : ''
                    }`}
                    placeholder="e.g. Invoice for Diwali sweets"
                    value={newAccount.description}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        description:
                          e.target.value,
                      })
                    }
                  />

                  {errors.description && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() =>
                    setShowAddModal(false)
                  }
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddAccount}
                  className="btn-primary"
                >
                  Create Khata
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
