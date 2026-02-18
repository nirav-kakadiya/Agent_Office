'use client';

import type { CostData } from '@/hooks/useMetrics';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  CHART_COLORS, CHART_THEME, ChartPanel,
} from './PixelChart';

interface Props {
  data: CostData;
}

export default function CostChart({ data }: Props) {
  const chartData = data.timeline.map((t) => ({
    date: t.date.slice(5),
    daily: Number(t.daily.toFixed(4)),
    cumulative: Number(t.cumulative.toFixed(4)),
  }));

  if (chartData.length === 0) {
    return (
      <ChartPanel title="CUMULATIVE COST ($)">
        <div className="h-full flex items-center justify-center text-office-muted font-pixel text-[8px]">
          NO DATA YET
        </div>
      </ChartPanel>
    );
  }

  return (
    <ChartPanel title="CUMULATIVE COST ($)">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis dataKey="date" {...CHART_THEME.axis} />
          <YAxis {...CHART_THEME.axis} />
          <Tooltip {...CHART_THEME.tooltip} />
          <Area type="monotone" dataKey="cumulative" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accent} fillOpacity={0.2} />
          <Area type="monotone" dataKey="daily" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.1} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
