export type AppRole = 'owner' | 'manager' | 'cashier' | 'helper';

export type Permission =
  | 'dashboard_view'
  | 'billing_view' | 'billing_create' | 'billing_edit'
  | 'products_view'
  | 'products_create' | 'products_edit' | 'products_delete'
  | 'customers_view' | 'customers_create' | 'customers_edit' | 'customers_delete'
  | 'purchases_view' | 'purchases_create' | 'purchases_edit' | 'purchases_delete'
  | 'stock_view' | 'stock_edit'
  | 'khatabook_view' | 'khatabook_edit'
  | 'staff_view' | 'staff_manage'
  | 'settings_view' | 'settings_edit';

export function defaultPermissions(role: AppRole): Permission[] {
  if (role === 'owner') {
    return [
      'dashboard_view', 'billing_view', 'billing_create', 'billing_edit',
      'products_view', 'products_create', 'products_edit', 'products_delete',
      'customers_view', 'customers_create', 'customers_edit', 'customers_delete',
      'purchases_view', 'purchases_create', 'purchases_edit', 'purchases_delete',
      'stock_view', 'stock_edit', 'khatabook_view', 'khatabook_edit',
      'staff_view', 'staff_manage', 'settings_view', 'settings_edit',
    ];
  }

  if (role === 'manager') {
    return [
      'dashboard_view', 'billing_view', 'billing_create', 'billing_edit',
      'products_view',
      'customers_view', 'customers_create', 'customers_edit', 'customers_delete',
      'purchases_view', 'purchases_create', 'purchases_edit', 'purchases_delete',
      'stock_view', 'stock_edit', 'khatabook_view', 'khatabook_edit',
    ];
  }

  if (role === 'cashier') {
    return [
      'dashboard_view', 'billing_view', 'billing_create', 'billing_edit',
      'products_view',
      'customers_view', 'customers_create', 'customers_edit',
      'khatabook_view', 'khatabook_edit',
    ];
  }

  return ['dashboard_view', 'products_view', 'customers_view', 'stock_view', 'khatabook_view'];
}

/** Never grant staff product CRUD even if an old database row contains it. */
export function sanitizeStaffPermissions(role: AppRole, permissions: unknown): Permission[] {
  const defaults = defaultPermissions(role);
  if (!Array.isArray(permissions)) return defaults;
  const allowed = new Set<Permission>(defaults);
  return permissions.filter((p): p is Permission => allowed.has(p as Permission));
}
