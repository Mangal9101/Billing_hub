'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, Trash2, X, Package, AlertTriangle } from 'lucide-react';
import { useAppStore, type Product } from '@/lib/store';

const units = ['kg', 'g', 'piece', 'box', 'packet', 'litre'];

const emptyProduct: Omit<Product, 'id'> = {
  name: '',
  sku: '',
  category: '',
  price: 0,
  stock: 0,
  unit: 'kg',
  lowStockAlert: 5,
};

export default function ProductsPage() {
  const { data, ready, addProduct, updateProduct, deleteProduct, markActivityRead } = useAppStore();

  React.useEffect(() => {
    if (ready) markActivityRead('products');
  }, [ready, markActivityRead]);

  const products = data.products;
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    setLowStockOnly(new URLSearchParams(window.location.search).get('lowStock') === '1');
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyProduct);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Omit<Product, 'id'>, string>>>({});

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);

    return matchesSearch && (!lowStockOnly || p.stock <= p.lowStockAlert);
  });

  const openAdd = () => {
    setEditingProduct(null);
    setForm({ ...emptyProduct });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price,
      stock: p.stock,
      unit: p.unit,
      lowStockAlert: p.lowStockAlert,
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const e: Partial<Record<keyof Omit<Product, 'id'>, string>> = {};

    if (!form.name.trim()) e.name = 'Product name required';
    if (!form.sku.trim()) e.sku = 'SKU required';
    if (form.price <= 0) e.price = 'Price must be greater than 0';
    if (form.stock < 0) e.stock = 'Stock cannot be negative';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, form);
    } else {
      addProduct(form);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setDeleteConfirm(null);
    setShowModal(false);
    setEditingProduct(null);
  };

  if (!ready) return null;

  return (
    <AppLayout activePath="/products">
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 max-w-screen-2xl mx-auto space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {products.length} products in inventory
            </p>
          </div>

          <button
            onClick={openAdd}
            className="btn-primary flex items-center justify-center gap-2 shrink-0 min-h-10 px-3 sm:px-4 text-sm"
          >
            <Plus size={17} />
            <span>Add Product</span>
          </button>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={lowStockOnly ? 'Search low-stock products...' : 'Search products...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 min-h-11 text-sm"
          />
        </div>

        {lowStockOnly && (
          <button
            onClick={() => {
              setLowStockOnly(false);
              window.history.replaceState({}, '', '/products');
            }}
            className="text-sm text-primary hover:underline"
          >
            Showing low-stock products · Clear filter
          </button>
        )}

        <div className="card overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm mobile-data-table products-table">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Stock</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Package size={32} className="mx-auto mb-2 opacity-30" />
                      No products found
                    </td>
                  </tr>
                )}

                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openEdit(p)}
                    className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {p.category || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-nums">
                      ₹{p.price.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          p.stock <= p.lowStockAlert ? 'text-red-600' : 'text-foreground'
                        }`}
                      >
                        {p.stock <= p.lowStockAlert && <AlertTriangle size={12} />}
                        {p.stock} {p.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {filtered.length === 0 && (
              <div className="text-center py-12 px-5 text-muted-foreground">
                <Package size={34} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No products found</p>
              </div>
            )}

            <div className="divide-y divide-border">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openEdit(p)}
                  className="w-full text-left px-4 py-4 active:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="inline-flex max-w-full items-center rounded-lg bg-primary/10 px-3 py-1.5 text-base font-bold text-primary truncate ring-1 ring-primary/10">
                        {p.name}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        SKU: <span className="font-mono text-xs">{p.sku}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-foreground">
                        ₹{p.price.toLocaleString('en-IN')}
                      </div>
                      <div
                        className={`text-sm font-bold mt-1 ${
                          p.stock <= p.lowStockAlert
                            ? 'text-red-700 bg-red-50 px-2 py-1 rounded-md'
                            : 'text-foreground bg-secondary px-2 py-1 rounded-md'
                        }`}
                      >
                        {p.stock <= p.lowStockAlert && (
                          <AlertTriangle size={13} className="inline mr-1 -mt-0.5" />
                        )}
                        {p.stock} {p.unit}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {p.category && (
                      <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                        {p.category}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Low stock alert: {p.lowStockAlert} {p.unit}
                    </span>
                  </div>

                  
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 fade-in p-3 sm:p-0">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-0 sm:mx-4 scale-in max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-card">
              <h2 className="text-lg font-semibold text-foreground">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Close"
              >
                <X size={19} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Product Name *
                  </label>
                  <input
                    className={`input-field min-h-11 text-sm ${errors.name ? 'border-red-400' : ''}`}
                    placeholder="Product Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">SKU *</label>
                  <input
                    className={`input-field min-h-11 text-sm ${errors.sku ? 'border-red-400' : ''}`}
                    placeholder="e.g. SKU-KK01"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                  {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Category</label>
                  <input
                    type="text"
                    className="input-field min-h-11 text-sm"
                    placeholder="Category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Price (₹) *</label>
                  <input
                    type="number"
                    className={`input-field min-h-11 text-sm ${errors.price ? 'border-red-400' : ''}`}
                    placeholder="0"
                    value={form.price || ''}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                  {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Unit</label>
                  <select
                    className="input-field min-h-11 text-sm"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Current Stock</label>
                  <input
                    type="number"
                    className={`input-field min-h-11 text-sm ${errors.stock ? 'border-red-400' : ''}`}
                    placeholder="0"
                    value={form.stock || ''}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  />
                  {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Low Stock Alert</label>
                  <input
                    type="number"
                    className="input-field min-h-11 text-sm"
                    placeholder="5"
                    value={form.lowStockAlert || ''}
                    onChange={(e) => setForm({ ...form, lowStockAlert: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 px-4 sm:px-6 py-4 border-t border-border bg-card">
              {editingProduct ? (
                <>
                  <button
                    onClick={() => setDeleteConfirm(editingProduct.id)}
                    className="w-full sm:w-auto min-h-11 px-5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>

                  <button
                    onClick={handleSave}
                    className="w-full sm:w-auto min-h-11 btn-primary font-semibold"
                  >
                    Update
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto min-h-11 btn-secondary"
                  >
                    Cancel
                  </button>

                  <button onClick={handleSave} className="w-full sm:w-auto min-h-11 btn-primary">
                    Add Product
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 fade-in p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm scale-in p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Delete Product</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 min-h-11">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 min-h-11 bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
