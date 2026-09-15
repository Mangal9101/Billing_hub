'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const colors = [
  'var(--payment-cash)',
  'var(--payment-upi)',
  'var(--payment-credit)',
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-elevated px-3 py-2.5 text-sm">
      <p className="font-semibold text-foreground mb-1">
        {label}
      </p>

      <p className="text-muted-foreground">
        Amount:{' '}
        <span className="font-mono-nums font-semibold text-foreground">
          ₹{(payload[0]?.value || 0).toLocaleString('en-IN')}
        </span>
      </p>
    </div>
  );
}

export default function PaymentModeChart() {
  const { data: appData, ready } = useAppStore();

  if (!ready) return null;

  // Only 3 payment modes:
  // Cash, UPI and Credit
  const data = ['Cash', 'UPI', 'Credit'].map((mode) => ({
    mode,

    amount: appData.invoices
      .filter((invoice: any) => invoice.mode === mode)
      .reduce(
        (sum: number, invoice: any) =>
          sum +
          (
            mode === 'Credit'
              ? Number(invoice.due) || 0
              : Number(invoice.paid) || 0
          ),
        0,
      ),

    count: appData.invoices.filter(
      (invoice: any) => invoice.mode === mode,
    ).length,
  }));

  const total = data.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  return (
    <div>
      {/* Payment Mode Bar Graph */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          margin={{
            top: 4,
            right: 4,
            left: -10,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />

          <XAxis
            dataKey="mode"
            tick={{
              fontSize: 10,
              fill: 'var(--muted-foreground)',
            }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{
              fontSize: 11,
              fill: 'var(--muted-foreground)',
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              `₹${(value / 1000).toFixed(0)}k`
            }
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar
            dataKey="amount"
            radius={[4, 4, 0, 0]}
          >
            {data.map((_, index) => (
              <Cell
                key={`bar-cell-${index}`}
                fill={colors[index]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div
            key={`legend-${item.mode}`}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor: colors[index],
                }}
              />

              <span className="text-muted-foreground text-xs truncate">
                {item.mode}
              </span>
            </div>

            <div className="flex items-center gap-3 ml-2">
              <span className="font-mono-nums text-xs text-foreground font-medium">
                ₹{item.amount.toLocaleString('en-IN')}
              </span>

              <span className="text-xs text-muted-foreground w-10 text-right">
                {total > 0
                  ? `${((item.amount / total) * 100).toFixed(0)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}