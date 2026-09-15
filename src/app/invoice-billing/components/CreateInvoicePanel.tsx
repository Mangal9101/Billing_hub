'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2, Search, X, Loader2, ChevronDown } from 'lucide-react';
import type { InvoiceRecord } from './InvoiceBillingScreen';
import { useAppStore } from '@/lib/store';

type LineItem = {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  total: number;
};

type FormData = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  items: LineItem[];
  discountType: 'flat' | 'percent';
  discount: number;
  paymentMode: 'Cash' | 'UPI' | 'Credit';
  paidAmount: number;
  notes: string;
};

interface Props {
  onSave: (inv: InvoiceRecord) => void;
  onCancel: () => void;
}

/*
 * Billing draft persistence
 *
 * The form is temporarily stored in sessionStorage so that if the user
 * moves to Dashboard / Products / Khatabook / any other section,
 * the unfinished billing form is restored when they return.
 *
 * The key is scoped to the current logged-in user + business so
 * different accounts/businesses never share a billing draft.
 */
const getDraftKey = () => {
  if (typeof window === 'undefined') return null;

  try {
    const sessionRaw = localStorage.getItem('billing_hub_session_v4');

    if (!sessionRaw) {
      return 'billing_hub_invoice_draft_v1';
    }

    const session = JSON.parse(sessionRaw);

    const userId = session?.userId || session?.uid || 'unknown-user';
    const businessId =
      session?.businessId ||
      session?.companyId ||
      'unknown-business';

    return `billing_hub_invoice_draft_v1:${userId}:${businessId}`;
  } catch {
    return 'billing_hub_invoice_draft_v1';
  }
};

const getDefaultFormValues = (): FormData => ({
  customerId: '',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  date: new Date().toLocaleDateString('en-GB'),
  items: [],
  discountType: 'flat',
  discount: 0,
  paymentMode: 'Cash',
  paidAmount: 0,
  notes: '',
});

export default function CreateInvoicePanel({ onSave, onCancel }: Props) {
  const { data, createInvoice } = useAppStore();

  const productCatalog = data.products;
  const customerList = data.customers;

  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const customerInputRef = useRef<HTMLInputElement>(null);

  const [customerMenuStyle, setCustomerMenuStyle] =
    useState<React.CSSProperties>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const draftKeyRef = useRef<string | null>(null);
  const restoringDraftRef = useRef(false);
  const draftReadyRef = useRef(false);
  const lastSavedDraftRef = useRef('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: getDefaultFormValues(),
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items',
  });

  /*
   * ------------------------------------------------------------
   * Restore unfinished billing draft
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const key = getDraftKey();
    draftKeyRef.current = key;

    if (!key) {
      draftReadyRef.current = true;
      return;
    }

    try {
      const raw = sessionStorage.getItem(key);

      if (raw) {
        const saved = JSON.parse(raw);

        if (saved?.form) {
          restoringDraftRef.current = true;

          const defaults = getDefaultFormValues();

          const restoredForm: FormData = {
            ...defaults,
            ...saved.form,
            items: Array.isArray(saved.form.items)
              ? saved.form.items
              : [],
          };

          reset(restoredForm);

          if (typeof saved.customerSearch === 'string') {
            setCustomerSearch(saved.customerSearch);
          } else {
            setCustomerSearch(restoredForm.customerName || '');
          }

          if (typeof saved.productSearch === 'string') {
            setProductSearch(saved.productSearch);
          }

          lastSavedDraftRef.current = raw;

          /*
           * Allow react-hook-form to finish restoring before
           * normal draft autosave starts.
           */
          window.setTimeout(() => {
            restoringDraftRef.current = false;
          }, 100);
        }
      }
    } catch {
      /*
       * If an old/corrupt draft exists, simply ignore it.
       * The billing UI should still open normally.
       */
    }

    draftReadyRef.current = true;
  }, [reset]);

  const watchedForm = watch();

  /*
   * ------------------------------------------------------------
   * Automatically save unfinished billing draft
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!draftReadyRef.current) return;
    if (restoringDraftRef.current) return;
    if (isSubmitting) return;

    const key = draftKeyRef.current || getDraftKey();

    if (!key) return;

    const draftPayload = {
      version: 1,
      form: watchedForm,
      customerSearch,
      productSearch,
      savedAt: Date.now(),
    };

    /*
     * Don't create unnecessary sessionStorage writes.
     */
    const serialized = JSON.stringify(draftPayload);

    if (serialized === lastSavedDraftRef.current) {
      return;
    }

    try {
      sessionStorage.setItem(key, serialized);
      lastSavedDraftRef.current = serialized;
    } catch {
      /*
       * Storage can fail in private/restricted browser modes.
       * Billing itself should continue working normally.
       */
    }
  }, [
    watchedForm,
    customerSearch,
    productSearch,
    isSubmitting,
  ]);

  /*
   * Clear unfinished draft after successful invoice creation
   * or when user explicitly cancels.
   */
  const clearBillingDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    const key = draftKeyRef.current || getDraftKey();

    if (!key) return;

    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }

    lastSavedDraftRef.current = '';
  }, []);

  /*
   * Customer dropdown positioning
   */
  useEffect(() => {
    if (!showCustomerDropdown || !customerInputRef.current) return;

    const update = () => {
      const r = customerInputRef.current?.getBoundingClientRect();

      if (r) {
        setCustomerMenuStyle({
          position: 'fixed',
          top: r.bottom + 4,
          left: r.left,
          width: r.width,
          zIndex: 9999,
        });
      }
    };

    update();

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showCustomerDropdown]);

  const watchItems = watch('items');
  const watchDiscount = watch('discount');
  const watchDiscountType = watch('discountType');
  const watchPaid = watch('paidAmount');
  const watchMode = watch('paymentMode');

  const subtotal = watchItems.reduce(
    (sum, item) =>
      sum + (Number(item.qty) * Number(item.unitPrice) || 0),
    0,
  );

  const discountAmt =
    watchDiscountType === 'percent'
      ? Math.round(
          subtotal * ((Number(watchDiscount) || 0) / 100),
        )
      : Number(watchDiscount) || 0;

  const total = Math.max(0, subtotal - discountAmt);

  const paidAmt =
    watchMode === 'Credit'
      ? 0
      : Number(watchPaid) || 0;

  const dueAmt = Math.max(0, total - paidAmt);

  const filteredProducts = productCatalog.filter(
    (p) =>
      p.name
        .toLowerCase()
        .includes(productSearch.toLowerCase()) ||
      p.sku
        .toLowerCase()
        .includes(productSearch.toLowerCase()),
  );

  const filteredCustomers = customerList.filter(
    (c) =>
      c.name
        .toLowerCase()
        .includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch),
  );

  /*
   * ------------------------------------------------------------
   * Product handling
   * ------------------------------------------------------------
   */
  const addProduct = useCallback(
    (prod: (typeof productCatalog)[0]) => {
      const availableStock = Number(prod.stock) || 0;

      if (availableStock <= 0) {
        toast.error(`${prod.name} is out of stock`);
        return;
      }

      const existing = fields.findIndex(
        (field) => field.productId === prod.id,
      );

      if (existing >= 0) {
        const current = watchItems[existing];
        const currentQty = Number(current?.qty) || 0;

        if (currentQty >= availableStock) {
          toast.error(
            `Insufficient stock: only ${availableStock} ${
              availableStock === 1 ? 'unit' : 'units'
            } available`,
          );
          return;
        }

        const nextQty = currentQty + 1;

        setValue(`items.${existing}.qty`, nextQty);
        setValue(
          `items.${existing}.total`,
          nextQty * (current?.unitPrice || 0),
        );
      } else {
        append({
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          qty: 1,
          unitPrice: prod.price,
          total: prod.price,
        });
      }

      setProductSearch('');
      setShowProductDropdown(false);
    },
    [
      fields,
      watchItems,
      append,
      setValue,
    ],
  );

  /*
   * ------------------------------------------------------------
   * Customer handling
   * ------------------------------------------------------------
   */
  const selectCustomer = (cust: (typeof customerList)[0]) => {
    setValue('customerId', cust.id);
    setValue('customerName', cust.name);
    setValue('customerPhone', cust.phone);
    setValue('customerAddress', cust.address);

    setCustomerSearch(cust.name);
    setShowCustomerDropdown(false);
  };

  /*
   * ------------------------------------------------------------
   * Quantity handling
   * ------------------------------------------------------------
   */
  const updateLineQty = (idx: number, qty: number) => {
    const item = watchItems[idx];

    if (!item) return;

    const product = productCatalog.find(
      (p) => p.id === item.productId,
    );

    const availableStock = Number(product?.stock) || 0;

    const requestedQty = Math.max(
      1,
      Number(qty) || 1,
    );

    if (availableStock <= 0) {
      toast.error(`${item.name} is out of stock`);
      return;
    }

    if (requestedQty > availableStock) {
      toast.error(
        `Insufficient stock for ${item.name}: only ${availableStock} available`,
      );

      setValue(
        `items.${idx}.qty`,
        availableStock,
      );

      setValue(
        `items.${idx}.total`,
        availableStock * (item.unitPrice || 0),
      );

      return;
    }

    const price = item.unitPrice || 0;

    setValue(
      `items.${idx}.qty`,
      requestedQty,
    );

    setValue(
      `items.${idx}.total`,
      requestedQty * price,
    );
  };

  /*
   * ------------------------------------------------------------
   * Submit invoice
   * ------------------------------------------------------------
   */
  const onSubmit = async (formData: FormData) => {
    if (formData.items.length === 0) {
      toast.error('Add at least one product to the invoice');
      return;
    }

    /*
     * Final stock check against latest product catalog.
     */
    for (const item of formData.items) {
      const product = productCatalog.find(
        (p) => p.id === item.productId,
      );

      const availableStock =
        Number(product?.stock) || 0;

      const requestedQty =
        Number(item.qty) || 0;

      if (!product) {
        toast.error(
          `Product "${item.name}" is no longer available`,
        );
        return;
      }

      if (availableStock <= 0) {
        toast.error(`${item.name} is out of stock`);
        return;
      }

      if (requestedQty <= 0) {
        toast.error(
          `Invalid quantity for ${item.name}`,
        );
        return;
      }

      if (requestedQty > availableStock) {
        toast.error(
          `Insufficient stock for ${item.name}: only ${availableStock} available`,
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const inv = createInvoice({
        customerId:
          formData.customerId || undefined,

        customer:
          formData.customerName ||
          'Walk-in Customer',

        phone: formData.customerPhone,

        address: formData.customerAddress,

        items: formData.items.map((item) => ({
          ...item,
          total:
            item.qty * item.unitPrice,
        })),

        subtotal,

        discount: discountAmt,

        discountType:
          formData.discountType,

        total,

        paid: paidAmt,

        mode:
          formData.paymentMode,

        notes:
          formData.notes,
      });

      /*
       * Invoice successfully created.
       * Now remove the unfinished draft.
       */
      clearBillingDraft();

      toast.success(
        `Invoice ${inv.id} created successfully!`,
      );

      onSave(inv);
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Cancel billing
   * ------------------------------------------------------------
   */
  const handleCancel = () => {
    clearBillingDraft();
    onCancel();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Create New Invoice
          </h2>

          <p className="text-xs text-muted-foreground">
            Fill in customer and product details
          </p>
        </div>

        <button
          onClick={handleCancel}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          title="Close"
        >
          <X
            size={18}
            className="text-muted-foreground"
          />
        </button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        <div className="px-6 py-5 space-y-6 max-w-2xl">

          {/* Customer Section */}
          <div className="card border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                1
              </span>
              Customer Details
            </h3>

            <div className="relative">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Search Customer
                <span className="text-muted-foreground font-normal ml-1">
                  (optional — leave blank for walk-in)
                </span>
              </label>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  ref={customerInputRef}
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(
                      e.target.value,
                    );
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() =>
                    setShowCustomerDropdown(true)
                  }
                  onBlur={() => {
                    window.setTimeout(
                      () =>
                        setShowCustomerDropdown(
                          false,
                        ),
                      120,
                    );
                  }}
                  placeholder="Search by name or phone..."
                  className="input-field pl-9 text-sm"
                />
              </div>

              {showCustomerDropdown &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    style={customerMenuStyle}
                    className="bg-card border border-border rounded-lg shadow-elevated max-h-48 overflow-y-auto scrollbar-thin"
                  >
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(
                        (cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onMouseDown={(e) =>
                              e.preventDefault()
                            }
                            onClick={() =>
                              selectCustomer(
                                cust,
                              )
                            }
                            className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border last:border-0"
                          >
                            <p className="text-sm font-medium text-foreground">
                              {cust.name}
                            </p>

                            <p className="text-xs text-muted-foreground font-mono">
                              {cust.phone ||
                                'No phone'}{' '}
                              ·{' '}
                              {cust.address ||
                                'No address'}
                            </p>
                          </button>
                        ),
                      )
                    ) : (
                      <div className="px-3 py-3 text-xs text-muted-foreground">
                        No customers found
                      </div>
                    )}
                  </div>,
                  document.body,
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Customer Name
                </label>

                <input
                  {...register(
                    'customerName',
                    {
                      onChange: (e) => {
                        setValue(
                          'customerId',
                          '',
                        );

                        setCustomerSearch(
                          e.target.value,
                        );

                        setShowCustomerDropdown(
                          true,
                        );
                      },
                    },
                  )}
                  type="text"
                  placeholder="Walk-in Customer"
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Phone Number
                </label>

                <input
                  {...register(
                    'customerPhone',
                    {
                      onChange: () =>
                        setValue(
                          'customerId',
                          '',
                        ),
                    },
                  )}
                  type="tel"
                  placeholder="98XXXXXXXX"
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Address
              </label>

              <input
                {...register(
                  'customerAddress',
                )}
                type="text"
                placeholder="Customer address (optional)"
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Invoice Date
              </label>

              <input
                {...register('date', {
                  required:
                    'Date is required',
                })}
                type="text"
                placeholder="DD/MM/YYYY"
                className="input-field text-sm"
              />

              {errors.date && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.date.message}
                </p>
              )}
            </div>
          </div>

          {/* Products Section */}
          <div className="card border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                2
              </span>
              Products / Items
            </h3>

            <div className="relative">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Add Product
              </label>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(
                      e.target.value,
                    );
                    setShowProductDropdown(true);
                  }}
                  onFocus={() =>
                    setShowProductDropdown(true)
                  }
                  placeholder="Search product by name or SKU..."
                  className="input-field pl-9 text-sm"
                />
              </div>

              {showProductDropdown &&
                productSearch &&
                filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg shadow-elevated z-20 mt-1 max-h-52 overflow-y-auto scrollbar-thin">
                    {filteredProducts.map(
                      (prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() =>
                            addProduct(prod)
                          }
                          disabled={
                            Number(prod.stock) <=
                            0
                          }
                          className={`w-full text-left px-3 py-2.5 transition-colors border-b border-border last:border-0 ${
                            Number(prod.stock) <=
                            0
                              ? 'opacity-60 cursor-not-allowed bg-secondary/30'
                              : 'hover:bg-secondary'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {prod.name}
                              </p>

                              <p className="text-xs text-muted-foreground font-mono">
                                {prod.sku}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-mono-nums text-sm font-semibold text-foreground">
                                ₹{prod.price}
                              </p>

                              <p
                                className={`text-[10px] font-medium ${
                                  prod.stock === 0
                                    ? 'text-red-600'
                                    : prod.stock < 10
                                      ? 'text-amber-600'
                                      : 'text-green-600'
                                }`}
                              >
                                {prod.stock === 0
                                  ? 'Out of stock'
                                  : `${prod.stock} in stock`}
                              </p>
                            </div>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}
            </div>

            {fields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm mobile-data-table billing-items-table">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground">
                        Product
                      </th>

                      <th className="text-center py-2 text-xs font-semibold text-muted-foreground w-24">
                        Qty
                      </th>

                      <th className="text-right py-2 text-xs font-semibold text-muted-foreground w-24">
                        Unit Price
                      </th>

                      <th className="text-right py-2 text-xs font-semibold text-muted-foreground w-24">
                        Total
                      </th>

                      <th className="w-8" />
                    </tr>
                  </thead>

                  <tbody>
                    {fields.map(
                      (field, idx) => {
                        const item =
                          watchItems[idx];

                        return (
                          <tr
                            key={field.id}
                            className="border-b border-border last:border-0 group"
                          >
                            <td className="py-2.5 pr-2">
                              <p className="font-medium text-foreground text-sm">
                                {item?.name}
                              </p>

                              <p className="text-[10px] text-muted-foreground font-mono">
                                {item?.sku}
                              </p>

                              {(() => {
                                const stock =
                                  Number(
                                    productCatalog.find(
                                      (p) =>
                                        p.id ===
                                        item?.productId,
                                    )?.stock,
                                  ) || 0;

                                return (
                                  <p
                                    className={`text-[10px] font-medium ${
                                      stock <= 0
                                        ? 'text-red-600'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {stock <= 0
                                      ? 'Out of stock'
                                      : `${stock} in stock`}
                                  </p>
                                );
                              })()}
                            </td>

                            <td className="py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLineQty(
                                      idx,
                                      Math.max(
                                        1,
                                        (item?.qty ||
                                          1) - 1,
                                      ),
                                    )
                                  }
                                  className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground"
                                >
                                  <span className="text-sm leading-none">
                                    −
                                  </span>
                                </button>

                                <input
                                  type="number"
                                  min={1}
                                  max={Math.max(
                                    1,
                                    Number(
                                      productCatalog.find(
                                        (p) =>
                                          p.id ===
                                          item?.productId,
                                      )?.stock,
                                    ) || 0,
                                  )}
                                  value={
                                    item?.qty || 1
                                  }
                                  onChange={(e) => {
                                    const product =
                                      productCatalog.find(
                                        (p) =>
                                          p.id ===
                                          item?.productId,
                                      );

                                    const availableStock =
                                      Number(
                                        product?.stock,
                                      ) || 0;

                                    const rawQty =
                                      parseInt(
                                        e.target.value,
                                        10,
                                      );

                                    if (
                                      availableStock <=
                                      0
                                    ) {
                                      toast.error(
                                        `${
                                          item?.name ||
                                          'Product'
                                        } is out of stock`,
                                      );
                                      return;
                                    }

                                    if (
                                      rawQty >
                                      availableStock
                                    ) {
                                      toast.error(
                                        `Maximum available stock is ${availableStock}`,
                                      );

                                      updateLineQty(
                                        idx,
                                        availableStock,
                                      );

                                      return;
                                    }

                                    updateLineQty(
                                      idx,
                                      Math.max(
                                        1,
                                        rawQty || 1,
                                      ),
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      [
                                        'e',
                                        'E',
                                        '+',
                                        '-',
                                      ].includes(
                                        e.key,
                                      )
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                  className="w-10 text-center border border-border rounded px-1 py-1 text-sm bg-input focus:outline-none focus:ring-1 focus:ring-ring"
                                />

                                <button
                                  type="button"
                                  disabled={(() => {
                                    const stock =
                                      Number(
                                        productCatalog.find(
                                          (p) =>
                                            p.id ===
                                            item?.productId,
                                        )?.stock,
                                      ) || 0;

                                    return (
                                      stock <= 0 ||
                                      (item?.qty ||
                                        0) >= stock
                                    );
                                  })()}
                                  onClick={() =>
                                    updateLineQty(
                                      idx,
                                      (item?.qty ||
                                        1) + 1,
                                    )
                                  }
                                  className={`w-6 h-6 rounded border border-border flex items-center justify-center transition-colors ${
                                    (() => {
                                      const stock =
                                        Number(
                                          productCatalog.find(
                                            (p) =>
                                              p.id ===
                                              item?.productId,
                                          )?.stock,
                                        ) || 0;

                                      return stock <=
                                        0 ||
                                        (item?.qty ||
                                          0) >=
                                          stock
                                        ? 'opacity-40 cursor-not-allowed'
                                        : 'hover:bg-secondary text-muted-foreground';
                                    })()
                                  }`}
                                  title={(() => {
                                    const stock =
                                      Number(
                                        productCatalog.find(
                                          (p) =>
                                            p.id ===
                                            item?.productId,
                                        )?.stock,
                                      ) || 0;

                                    return (
                                      (item?.qty ||
                                        0) >= stock
                                        ? 'Maximum available stock reached'
                                        : 'Increase quantity'
                                    );
                                  })()}
                                >
                                  <span className="text-sm leading-none">
                                    +
                                  </span>
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                value={
                                  item?.unitPrice ||
                                  0
                                }
                                onChange={(e) => {
                                  const price =
                                    parseFloat(
                                      e.target.value,
                                    ) || 0;

                                  setValue(
                                    `items.${idx}.unitPrice`,
                                    price,
                                  );

                                  setValue(
                                    `items.${idx}.total`,
                                    (item?.qty ||
                                      1) * price,
                                  );
                                }}
                                className="w-20 text-right border border-border rounded px-2 py-1 text-sm bg-input focus:outline-none focus:ring-1 focus:ring-ring font-mono-nums"
                              />
                            </td>

                            <td className="py-2.5 text-right">
                              <span className="font-mono-nums font-semibold text-foreground">
                                ₹
                                {(
                                  (item?.qty ||
                                    0) *
                                  (item?.unitPrice ||
                                    0)
                                ).toLocaleString(
                                  'en-IN',
                                )}
                              </span>
                            </td>

                            <td className="py-2.5 pl-2">
                              <button
                                type="button"
                                onClick={() =>
                                  remove(idx)
                                }
                                className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-lg">
                <Plus
                  size={20}
                  className="text-muted-foreground mb-2"
                />

                <p className="text-sm text-muted-foreground">
                  Search and add products above
                </p>
              </div>
            )}
          </div>

          {/* Discount & Totals */}
          <div className="card border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                3
              </span>
              Discount & Totals
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Discount Type
                </label>

                <div className="relative">
                  <select
                    {...register(
                      'discountType',
                    )}
                    className="input-field text-sm appearance-none pr-8"
                  >
                    <option value="flat">
                      Flat Amount (₹)
                    </option>

                    <option value="percent">
                      Percentage (%)
                    </option>
                  </select>

                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Discount{' '}
                  {watchDiscountType ===
                  'percent'
                    ? '(%)'
                    : '(₹)'}
                </label>

                <input
                  {...register('discount', {
                    min: 0,
                  })}
                  type="number"
                  min={0}
                  placeholder="0"
                  className="input-field text-sm font-mono-nums"
                />
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>

                <span className="font-mono-nums">
                  ₹
                  {subtotal.toLocaleString(
                    'en-IN',
                  )}
                </span>
              </div>

              {discountAmt > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>
                    Discount{' '}
                    {watchDiscountType ===
                    'percent'
                      ? `(${watchDiscount}%)`
                      : ''}
                  </span>

                  <span className="font-mono-nums">
                    − ₹
                    {discountAmt.toLocaleString(
                      'en-IN',
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 mt-2">
                <span>Total</span>

                <span className="font-mono-nums text-lg">
                  ₹
                  {total.toLocaleString(
                    'en-IN',
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="card border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                4
              </span>
              Payment Details
            </h3>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Payment Mode
              </label>

              <div className="flex gap-2">
                {(
                  [
                    'Cash',
                    'UPI',
                    'Credit',
                  ] as const
                ).map((mode) => (
                  <button
                    key={`paymode-${mode}`}
                    type="button"
                    onClick={() => {
                      setValue(
                        'paymentMode',
                        mode,
                      );

                      if (mode === 'Credit') {
                        setValue(
                          'paidAmount',
                          0,
                        );
                      } else {
                        setValue(
                          'paidAmount',
                          total,
                        );
                      }
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150
                      ${
                        watchMode === mode
                          ? mode === 'Cash'
                            ? 'bg-green-600 text-white border-green-600'
                            : mode === 'UPI'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-red-600 text-white border-red-600'
                          : 'bg-card border-border text-muted-foreground hover:bg-secondary'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {watchMode !== 'Credit' && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Amount Paid (₹)
                  <span className="text-muted-foreground font-normal ml-1">
                    — balance becomes due
                  </span>
                </label>

                <input
                  {...register(
                    'paidAmount',
                    {
                      min: 0,
                    },
                  )}
                  type="number"
                  min={0}
                  max={total}
                  placeholder={total.toString()}
                  className="input-field text-sm font-mono-nums"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Bill Total
                </p>

                <p className="font-mono-nums font-bold text-foreground">
                  ₹
                  {total.toLocaleString(
                    'en-IN',
                  )}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-green-700 uppercase tracking-wider mb-1">
                  Paid
                </p>

                <p className="font-mono-nums font-bold text-green-700">
                  ₹
                  {paidAmt.toLocaleString(
                    'en-IN',
                  )}
                </p>
              </div>

              <div
                className={`rounded-lg p-3 text-center ${
                  dueAmt > 0
                    ? 'bg-red-50'
                    : 'bg-green-50'
                }`}
              >
                <p
                  className={`text-[10px] uppercase tracking-wider mb-1 ${
                    dueAmt > 0
                      ? 'text-red-700'
                      : 'text-green-700'
                  }`}
                >
                  Due
                </p>

                <p
                  className={`font-mono-nums font-bold ${
                    dueAmt > 0
                      ? 'text-red-700'
                      : 'text-green-700'
                  }`}
                >
                  ₹
                  {dueAmt.toLocaleString(
                    'en-IN',
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card border border-border p-4">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notes (optional)
            </label>

            <p className="text-[10px] text-muted-foreground mb-2">
              Internal notes about this invoice — not printed on bill
            </p>

            <textarea
              {...register('notes')}
              rows={2}
              placeholder="e.g. Regular customer, festival order, balance pending..."
              className="input-field text-sm resize-none"
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary px-5"
          >
            Cancel
          </button>

          <div className="sticky bottom-0 flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Invoice Total
              </p>

              <p className="font-mono-nums font-bold text-foreground">
                ₹
                {total.toLocaleString(
                  'en-IN',
                )}
              </p>
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                fields.length === 0
              }
              className="btn-primary flex items-center gap-2 px-6 py-2.5 min-w-[160px] justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>Create Invoice</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
