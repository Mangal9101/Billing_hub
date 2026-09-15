'use client';

'use client';
import React from 'react';
import { useAppStore } from '@/lib/store';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-elevated px-3 py-2.5 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        Sales: <span className="font-mono-nums font-semibold text-primary">
          ₹{payload[0]?.value?.toLocaleString('en-IN')}
        </span>
      </p>
      <p className="text-muted-foreground">
        Invoices: <span className="font-semibold text-foreground">{payload[1]?.value}</span>
      </p>
    </div>
  );
}

export default function SalesTrendChart() {
  const {data:appData,ready}=useAppStore();
  if(!ready)return null;
  const data=Array.from({length:7},(_,n)=>{const d=new Date();d.setDate(d.getDate()-(6-n));const key=d.toLocaleDateString('en-GB');const inv=appData.invoices.filter((i:any)=>i.date===key);return {day:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),sales:inv.reduce((s:number,i:any)=>s+i.total,0),invoices:inv.length};});
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#salesGradient)"
          dot={{ fill: 'var(--primary)', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: 'var(--primary)' }}
        />
        <Area
          type="monotone"
          dataKey="invoices"
          stroke="var(--accent)"
          strokeWidth={1.5}
          fill="none"
          strokeDasharray="4 2"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}