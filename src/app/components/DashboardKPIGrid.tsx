'use client';
import React from 'react';
import { useAppStore } from '@/lib/store';
import { TrendingUp, TrendingDown, AlertTriangle, FileText, Banknote, Smartphone,  } from 'lucide-react';

const makeKpis = (data:any) => { const today=new Date().toLocaleDateString('en-GB'); const inv=data.invoices.filter((i:any)=>i.date===today); const sales=inv.reduce((s:number,i:any)=>s+i.total,0); const cash=inv.filter((i:any)=>i.mode==='Cash').reduce((s:number,i:any)=>s+i.paid,0); const upi=inv.filter((i:any)=>i.mode==='UPI').reduce((s:number,i:any)=>s+i.paid,0); const dues=data.customers.reduce((s:number,c:any)=>s+c.outstanding,0); const low=data.products.filter((p:any)=>p.stock<=p.lowStockAlert); return [ {id:'kpi-today-sales',label:"Today's Sales",value:`₹${sales.toLocaleString('en-IN')}`,subValue:`${inv.reduce((s:number,i:any)=>s+i.items.reduce((q:number,x:any)=>q+x.qty,0),0)} items sold`,change:'Live',changeDir:'up',note:'From saved invoices',icon:<TrendingUp size={20}/>,accent:'primary',hero:true}, {id:'kpi-pending-dues',label:'Pending Dues',value:`₹${dues.toLocaleString('en-IN')}`,subValue:`${data.customers.filter((c:any)=>c.outstanding>0).length} customers`,change:'Live',changeDir:'down',note:'Current outstanding',icon:<AlertTriangle size={18}/>,accent:'warning',hero:false}, {id:'kpi-low-stock',label:'Low Stock Alerts',value:`${low.length} items`,subValue:`${data.products.filter((p:any)=>p.stock<=0).length} out of stock`,change:'Action needed',changeDir:'down',note:'Below minimum threshold',icon:<AlertTriangle size={18}/>,accent:'danger',hero:false}, {id:'kpi-invoices-today',label:"Today's Invoices",value:String(inv.length),subValue:`${inv.filter((i:any)=>i.status==='Paid').length} paid · ${inv.filter((i:any)=>i.due>0).length} credit`,change:'Live',changeDir:'up',note:'Saved invoice count',icon:<FileText size={18}/>,accent:'neutral',hero:false}, {id:'kpi-cash',label:'Cash Collected',value:`₹${cash.toLocaleString('en-IN')}`,subValue:`${inv.filter((i:any)=>i.mode==='Cash').length} transactions`,change:'Live',changeDir:'up',note:'Today',icon:<Banknote size={18}/>,accent:'green',hero:false}, {id:'kpi-upi',label:'UPI Received',value:`₹${upi.toLocaleString('en-IN')}`,subValue:`${inv.filter((i:any)=>i.mode==='UPI').length} transactions`,change:'Live',changeDir:'up',note:'Today',icon:<Smartphone size={18}/>,accent:'blue',hero:false} ]; };

const accentStyles: Record<string, { card: string; icon: string; badge: string }> = {
  primary: {
    card: 'bg-primary text-primary-foreground',
    icon: 'bg-white/20 text-primary-foreground',
    badge: 'bg-white/20 text-primary-foreground',
  },
  warning: {
    card: 'bg-amber-50 border-amber-200',
    icon: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  danger: {
    card: 'bg-red-50 border-red-200',
    icon: 'bg-red-100 text-red-600',
    badge: 'bg-red-100 text-red-600',
  },
  neutral: {
    card: 'bg-card border-border',
    icon: 'bg-secondary text-foreground',
    badge: 'bg-secondary text-foreground',
  },
  green: {
    card: 'bg-green-50 border-green-200',
    icon: 'bg-green-100 text-green-700',
    badge: 'bg-green-100 text-green-700',
  },
  blue: {
    card: 'bg-blue-50 border-blue-200',
    icon: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
};

export default function DashboardKPIGrid() {
  const {data,ready}=useAppStore();
  if(!ready)return null;
  const kpiData=makeKpis(data);
  // Grid plan: 6 cards → grid-cols-4
  // Row 1: hero spans 2 cols + 2 regular = 4 cols
  // Row 2: 3 regular cards — last spans 2 cols to fill row? No: 3 cols in a 4-col grid
  // Better: hero spans 2 cols (row1 col1-2), 2 cards (row1 col3-4), then row2: 3 cards in cols 1-3 + last card spans to fill
  // Simplest clean layout: hero 2-col span + 2 normal = row1; then 3 cards = row2 but 3 in 4-col leaves gap
  // Fix: use grid-cols-3 on xl, hero spans 1 col but larger, or use grid-cols-6 with hero spanning 2
  // Final plan: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4
  // Hero spans 2 cols. Row1: hero(2) + card(1) + card(1) = 4. Row2: card(1)+card(1)+card(1)+empty? No.
  // Best: hero spans 2, remaining 5 cards fill 2+3 across rows.
  // Use grid-cols-4: row1 hero(2)+c2(1)+c3(1)=4, row2 c4(1)+c5(1)+c6(1)+ pad with col-span to fill
  // c6 spans 2 to balance: row2 c4+c5+c6(span2) = 4 ✓

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpiData.map((kpi, idx) => {
        const styles = accentStyles[kpi.accent];
        const isHero = kpi.hero;
        const isLast = idx === kpiData.length - 1;

        return (
          <div
            key={kpi.id}
            className={`
              card border p-5 rounded-xl
              ${isHero ? 'sm:col-span-2 xl:col-span-2' : ''}
              ${isLast ? 'sm:col-span-2 xl:col-span-2' : ''}
              ${styles.card}
              transition-shadow hover:shadow-elevated
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
                {kpi.icon}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${styles.badge}`}>
                {kpi.changeDir === 'up' ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}
                {kpi.change}
              </span>
            </div>

            <div className="space-y-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${
                kpi.accent === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {kpi.label}
              </p>
              <p className={`font-mono-nums font-bold leading-none ${
                isHero ? 'text-4xl' : 'text-2xl'
              } ${kpi.accent === 'primary' ? 'text-primary-foreground' : 'text-foreground'}`}>
                {kpi.value}
              </p>
              <p className={`text-xs ${kpi.accent === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {kpi.subValue}
              </p>
            </div>

            <p className={`text-xs mt-3 ${kpi.accent === 'primary' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
              {kpi.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}