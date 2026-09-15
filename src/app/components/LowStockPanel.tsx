import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Package } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function LowStockPanel() {
  const {data,ready}=useAppStore();
  const lowStockItems=data.products.filter((p:any)=>p.stock<=p.lowStockAlert).map((p:any)=>({id:p.id,name:p.name,sku:p.sku,current:p.stock,min:p.lowStockAlert,unit:p.unit,status:p.stock<=0?'out':'low'}));
  if(!ready)return null;
  const outOfStock = lowStockItems?.filter((i) => i?.status === 'out');
  const lowStock = lowStockItems?.filter((i) => i?.status === 'low');

  return (
    <div className="card border border-red-200 bg-red-50/30 h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-red-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Stock Alerts</h3>
            <p className="text-xs text-muted-foreground">
              {outOfStock?.length} out of stock · {lowStock?.length} low
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">
          {lowStockItems?.length} items
        </span>
      </div>

      <div className="overflow-y-auto max-h-[420px] scrollbar-thin">
        {outOfStock?.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-red-100/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">Out of Stock</p>
            </div>
            {outOfStock?.map((item) => (
              <div key={item?.id} className="flex items-center gap-3 px-5 py-3 border-b border-red-100 hover:bg-red-50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Package size={13} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item?.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item?.sku}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-red-600 font-mono-nums">0 {item?.unit}</span>
                  <p className="text-[10px] text-muted-foreground">min: {item?.min}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {lowStock?.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-amber-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Low Stock</p>
            </div>
            {lowStock?.map((item) => (
              <div key={item?.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Package size={13} className="text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item?.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item?.sku}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-amber-700 font-mono-nums">
                    {item?.current} {item?.unit}
                  </span>
                  <p className="text-[10px] text-muted-foreground">min: {item?.min}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-red-200">
        <Link href="/products?lowStock=1" className="block w-full text-sm text-primary font-medium hover:underline text-center">
          View all products →
        </Link>
      </div>
    </div>
  );
}