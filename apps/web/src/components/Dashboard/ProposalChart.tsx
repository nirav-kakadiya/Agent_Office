'use client';

import type { TimelineData } from '@/hooks/useMetrics';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  CHART_COLORS, CHART_THEME, ChartPanel,
} from './PixelChart';

interface Props {
  data: TimelineData;
}

export default function ProposalChart({ data }: Props) {
  const chartData = Object.entries(data.proposals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: date.slice(5),
      approved: v.approved,
      rejected: v.rejected,
      pending: v.pending,
    }));

  if (chartData.length === 0) {
    return (
      <ChartPanel title="PROPOSAL THROUGHPUT">
        <div className="h-full flex items-center justify-center text-office-muted font-pixel text-[8px]">
          NO DATA YET
        </div>
      </ChartPanel>
    );
  }

  return (
    <ChartPanel title="PROPOSAL THROUGHPUT">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis dataKey="date" {...CHART_THEME.axis} />
          <YAxis {...CHART_THEME.axis} />
          <Tooltip {...CHART_THEME.tooltip} />
          <Bar dataKey="approved" fill={CHART_COLORS.green} stackId="a" />
          <Bar dataKey="rejected" fill={CHART_COLORS.red} stackId="a" />
          <Bar dataKey="pending" fill={CHART_COLORS.yellow} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
