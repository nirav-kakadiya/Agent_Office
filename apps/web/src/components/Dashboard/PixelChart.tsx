'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// SSR-safe recharts wrapper
const ResponsiveContainer = dynamic(
  () => import('recharts').then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const BarChart = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false });
const LineChart = dynamic(() => import('recharts').then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((m) => m.Line), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Legend = dynamic(() => import('recharts').then((m) => m.Legend), { ssr: false });
const PieChart = dynamic(() => import('recharts').then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then((m) => m.Cell), { ssr: false });

export {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell,
};

// Shared chart theme
export const CHART_COLORS = {
  accent: '#e94560',
  green: '#4ade80',
  red: '#ef4444',
  blue: '#60a5fa',
  yellow: '#facc15',
  purple: '#a78bfa',
  cyan: '#22d3ee',
};

export const CHART_THEME = {
  grid: { stroke: '#0f3460', strokeDasharray: '3 3' },
  axis: { stroke: '#888', fontSize: 8, fontFamily: '"Press Start 2P", monospace' },
  tooltip: {
    contentStyle: {
      backgroundColor: '#16213e',
      border: '1px solid #0f3460',
      borderRadius: '4px',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#eee',
    },
  },
};

export function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-office-panel border border-office-border rounded-lg p-4">
      <h3 className="font-pixel text-[9px] text-office-accent mb-3">{title}</h3>
      <div className="w-full h-48">{children}</div>
    </div>
  );
}
