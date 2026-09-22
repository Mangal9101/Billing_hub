'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  ShoppingCart,
  ArrowLeftRight,
  UserCog,
  BookOpen,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  getSession,
  clearSession,
  updateActiveBusiness,
  type Permission,
} from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  group?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard size={18} />,
    group: 'main',
  },
  {
    label: 'Invoice & Billing',
    href: '/invoice-billing',
    icon: <FileText size={18} />,
    group: 'main',
  },
  {
    label: 'Products',
    href: '/products',
    icon: <Package size={18} />,
    group: 'inventory',
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: <Users size={18} />,
    group: 'inventory',
  },
  {
    label: 'Purchases',
    href: '/purchases',
    icon: <ShoppingCart size={18} />,
    group: 'inventory',
  },
  {
    label: 'Stock Movements',
    href: '/stock-movements',
    icon: <ArrowLeftRight size={18} />,
    group: 'inventory',
  },
  {
    label: 'Khatabook',
    href: '/khatabook',
    icon: <BookOpen size={18} />,
    group: 'finance',
  },
  {
    label: 'Staff',
    href: '/staff',
    icon: <UserCog size={18} />,
    group: 'admin',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings size={18} />,
    group: 'admin',
  },
  {
    label: 'Plans & Billing',
    href: '/pricing?from=sidebar',
    icon: <CreditCard size={18} />,

    group: 'admin',
  },
];

const groupLabels: Record<string, string> = {
  main: 'Overview',
  inventory: 'Inventory',
  finance: 'Finance',
  admin: 'Administration',
};

interface BusinessOption {
  id: string;
  name: string;
  logoUrl?: string | null;
  role: string;
  permissions: Permission[];
  isOwner: boolean;
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  activePath: string;
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  activePath,
}: SidebarProps) {
  const groups = ['main', 'inventory', 'finance', 'admin'];

  const { data, markActivityRead } = useAppStore();
  const router = useRouter();

  const session = getSession();

  // Clear the local auth state first, then hard-navigate. This avoids waiting
  // for owner-only store/subscription listeners during the sign-out transition.
  const handleSignOut = () => {
    clearSession();
  };

  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadBusinesses = async () => {
      const s = getSession();

      if (!s?.accessToken) return;

      try {
        const cacheKey = 'billing_hub_businesses_cache_v1:' + s.uid;
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached?.businesses) && Date.now() - Number(cached.cachedAt || 0) < 60_000) {
            if (active) setBusinesses(cached.businesses);
            return;
          }
        }

        const r = await fetch('/api/businesses', {
          headers: {
            Authorization: `Bearer ${s.accessToken}`,
          },
          cache: 'no-store',
        });

        const j = await r.json();

        if (active && r.ok) {
          const list = Array.isArray(j.businesses) ? j.businesses : [];
          setBusinesses(list);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ businesses: list, cachedAt: Date.now() }));
          } catch {}
        }
      } catch {}
    };

    void loadBusinesses();

    window.addEventListener('sawariya-auth', loadBusinesses);

    return () => {
      active = false;
      window.removeEventListener('sawariya-auth', loadBusinesses);
    };
  }, [session?.uid, session?.companyId]);

  const can = (permission: Permission) =>
    !!session?.isOwner ||
    !!session?.permissions?.includes(permission);

  const canSettings = !!session?.isOwner;
  const canPlans = !!session?.isOwner;

  // Prefetch both the Staff page bundle and its data while the sidebar is visible.
  // This makes Staff open with the latest cached list instead of waiting on the API.
  useEffect(() => {
    if (!session?.isOwner || !session?.companyId || !session?.accessToken) return;

    // Prefetch Plans & Billing too. Without this, the pricing route can wait
    // for its JS chunk while the previous Dashboard is still visible, which
    // causes the short Dashboard/heading flash during navigation.
    router.prefetch('/pricing');
    router.prefetch('/staff');

    const key = 'billing_hub_staff_cache_' + session.companyId;
    const timeKey = key + ':time';
    try {
      const raw = sessionStorage.getItem(key);
      const cachedAt = Number(sessionStorage.getItem(timeKey) || 0);
      if (Array.isArray(raw ? JSON.parse(raw) : null) && Date.now() - cachedAt < 60_000) return;
    } catch {}

    fetch('/api/staff?businessId=' + encodeURIComponent(session.companyId), {
      headers: { Authorization: 'Bearer ' + session.accessToken },
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const j = await r.json();
        return Array.isArray(j.staff) ? j.staff : null;
      })
      .then((staff) => {
        if (!staff) return;
        try {
          // Keep the existing Staff page cache format unchanged.
          sessionStorage.setItem(key, JSON.stringify(staff));
          sessionStorage.setItem(timeKey, String(Date.now()));
        } catch {}
      })
      .catch(() => {});
  }, [router, session?.isOwner, session?.companyId, session?.accessToken]);

  const unreadCount = (
    category: 'invoice' | 'products' | 'khatabook'
  ) =>
    data.notifications?.filter(
      (n) => n.category === category && !n.read
    ).length || 0;

  const recentByHref: Record<string, boolean> = {
    '/invoice-billing': unreadCount('invoice') > 0,
    '/products': unreadCount('products') > 0,
    '/khatabook': unreadCount('khatabook') > 0,
  };

  const categoryForHref: Record<
    string,
    'invoice' | 'products' | 'khatabook'
  > = {
    '/invoice-billing': 'invoice',
    '/products': 'products',
    '/khatabook': 'khatabook',
  };

  const businessName = data.business.name || 'My Business';
  const logoUrl = data.business.logoUrl;

  const isActive = (href: string) =>
    href === '/'
      ? activePath === '/'
      : activePath.startsWith(href.split('?')[0]);

  const switchBusiness = async (business: BusinessOption) => {
    const current = getSession();

    if (!current || current.companyId === business.id) {
      setSwitchOpen(false);
      return;
    }

    setSwitchLoading(true);

    try {
      updateActiveBusiness(
        business.id,
        business.role as any,
        business.permissions || []
      );

      setSwitchOpen(false);
      onMobileClose();
    } finally {
      setSwitchLoading(false);
    }
  };

  const BusinessSwitcher = ({
    mobile = false,
    compact = false,
  }: {
    mobile?: boolean;
    compact?: boolean;
  }) => (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          businesses.length > 1 &&
          setSwitchOpen((value) => !value)
        }
        className={`flex items-center gap-2 ${
          mobile
            ? 'max-w-[210px]'
            : compact
              ? 'w-10'
              : 'w-full'
        } ${
          businesses.length > 1
            ? 'cursor-pointer hover:bg-secondary/60'
            : 'cursor-default'
        } rounded-lg p-1.5 transition-colors`}
        title={
          businesses.length > 1
            ? 'Switch business'
            : 'Current business'
        }
      >
        <div
          className={`${
            mobile ? 'w-7 h-7' : 'w-8 h-8'
          } rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0`}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Business logo"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-primary font-bold text-sm">
              {businessName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {!compact && (
          <span className="font-semibold text-sm text-foreground truncate flex-1 text-left">
            {businessName}
          </span>
        )}

        {businesses.length > 1 && (
          <ChevronDown
            size={15}
            className={`text-muted-foreground transition-transform ${
              switchOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {switchOpen && businesses.length > 1 && (
        <div className="absolute top-full mt-2 left-0 z-[70] w-64 rounded-xl border border-border bg-card shadow-xl p-1.5">
          <p className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Switch business
          </p>

          {businesses.map((business) => (
            <button
              key={business.id}
              type="button"
              disabled={switchLoading}
              onClick={() => void switchBusiness(business)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary text-left disabled:opacity-60"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                {business.logoUrl ? (
                  <img
                    src={business.logoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary text-xs font-bold">
                    {(business.name || 'B')
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">
                  {business.name}
                </span>

                <span className="block text-[10px] text-muted-foreground capitalize">
                  {business.role}
                </span>
              </span>

              {session?.companyId === business.id && (
                <Check size={15} className="text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderNavItems = (mobile = false) =>
    groups.map((group) => {
      const items = navItems.filter((item) => {
        if (item.group !== group) return false;

        if (item.href === '/settings') {
          return canSettings;
        }

        if (item.href === '/pricing') {
          return canPlans;
        }

        if (item.href === '/staff') {
          return can('staff_view');
        }

        if (item.href === '/products') {
          return can('products_view');
        }

        if (item.href === '/customers') {
          return can('customers_view');
        }

        if (item.href === '/purchases') {
          return can('purchases_view');
        }

        if (item.href === '/stock-movements') {
          return can('stock_view');
        }

        if (item.href === '/khatabook') {
          return can('khatabook_view');
        }

        if (item.href === '/invoice-billing') {
          return can('billing_view');
        }

        return true;
      });

      if (!items.length) return null;

      return (
        <div
          key={`${mobile ? 'mobile' : 'desktop'}-group-${group}`}
          className="mb-4"
        >
          {!collapsed && !mobile && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1">
              {groupLabels[group]}
            </p>
          )}

          {mobile && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1">
              {groupLabels[group]}
            </p>
          )}

          {items.map((item) => (
            <React.Fragment key={`${mobile ? 'mobile' : 'desktop'}-nav-wrap-${item.label}`}>
            <Link
              key={`${mobile ? 'mobile' : 'desktop'}-nav-${item.label}`}
              href={item.href}
              onClick={() => {
                const category = categoryForHref[item.href];

                if (category) {
                  markActivityRead(category);
                }

                onMobileClose();
              }}
              title={
                collapsed && !mobile
                  ? item.label
                  : undefined
              }
              className={`flex items-center gap-2.5 px-2 py-2 mb-0.5 group relative transition-all duration-150 ${
                item.href === '/settings'
                  ? `rounded-xl border border-primary/15 bg-primary/[0.04] shadow-sm ${
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary font-semibold border-primary/25'
                        : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-foreground hover:border-primary/25'
                    }`
                  : `rounded-lg ${
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`
              } ${
                collapsed && !mobile
                  ? 'justify-center'
                  : ''
              }`}
            >
              <span className="flex-shrink-0">
                {item.icon}
              </span>

              {(!collapsed || mobile) && (
                <span className="text-sm flex-1 truncate">
                  {item.label}
                </span>
              )}

              {(!collapsed || mobile) &&
                recentByHref[item.href] && (
                  <span
                    className="ml-auto w-2 h-2 rounded-full bg-accent shadow-sm"
                    title="Recent update"
                    aria-label="Recent update"
                  />
                )}

              {collapsed && !mobile && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </span>
              )}
            </Link>
            </React.Fragment>
          ))}
        </div>
      );
    });

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-full bg-card border-r border-border sidebar-transition ${
          collapsed
            ? 'w-16 min-w-[64px]'
            : 'w-60 min-w-[240px]'
        }`}
      >
        <div
          className={`flex items-center h-14 px-3 border-b border-border ${
            collapsed ? 'justify-center' : 'gap-2'
          }`}
        >
          {collapsed ? (
            <BusinessSwitcher compact />
          ) : (
            <BusinessSwitcher />
          )}
        </div>

        {!collapsed && (
          <div className="px-3 pt-1 pb-0">
            <p className="text-[10px] text-muted-foreground px-2">
              Billing Hub
            </p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
          {renderNavItems(false)}
        </nav>

        <div className="border-t border-border p-2 space-y-0.5">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-xs font-semibold">
                  {(data.business.ownerName || 'Owner')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {data.business.ownerName || 'Owner'}
                </p>

                <p className="text-[10px] text-muted-foreground">
                  {session?.isOwner ? 'Owner' : 'Staff'}
                </p>
              </div>

              <button
                className="p-1 rounded hover:bg-secondary"
                title="Notifications"
              >
                <Bell
                  size={14}
                  className="text-muted-foreground"
                />
              </button>
            </div>
          )}

          <a href="/sign-up-login" onClick={handleSignOut}
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors group relative ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={16} />

            {!collapsed && (
              <span className="text-sm">Sign Out</span>
            )}
          </a>

          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            aria-label={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <BusinessSwitcher mobile />

          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-secondary"
            aria-label="Close menu"
          >
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-4 pt-1">
          <p className="text-[10px] text-muted-foreground">
            Billing Hub
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
          {renderNavItems(true)}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-xs font-semibold">
                {(data.business.ownerName || 'Owner')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">
                {data.business.ownerName || 'Owner'}
              </p>

              <p className="text-xs text-muted-foreground">
                {session?.isOwner ? 'Owner' : 'Staff'}
              </p>
            </div>
          </div>

          <a href="/sign-up-login" onClick={handleSignOut}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            <span className="text-sm">Sign Out</span>
          </a>
        </div>
      </aside>
    </>
  );
}