'use client';

import type { TimelineData } from '@/hooks/useMetrics';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  CHART_COLORS, CHART_THEME, ChartPanel,
} from './PixelChart';

interface Props {
  data: TimelineData;
}

export default function MissionChart({ data }: Props) {
  const chartData = Object.entries(data.missions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: date.slice(5), // MM-DD
      succeeded: v.succeeded,
      failed: v.failed,
      total: v.total,
    }));

  if (chartData.length === 0) {
    return (
      <ChartPanel title="MISSION SUCCESS / FAILURE">
        <div className="h-full flex items-center justify-center text-office-muted font-pixel text-[8px]">
          NO DATA YET
        </div>
      </ChartPanel>
    );
  }

  return (
    <ChartPanel title="MISSION SUCCESS / FAILURE">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis dataKey="date" {...CHART_THEME.axis} />
          <YAxis {...CHART_THEME.axis} />
          <Tooltip {...CHART_THEME.tooltip} />
          <Bar dataKey="succeeded" fill={CHART_COLORS.green} stackId="a" />
          <Bar dataKey="failed" fill={CHART_COLORS.red} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
