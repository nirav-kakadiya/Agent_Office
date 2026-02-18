'use client';

import type { MetricsOverview } from '@/hooks/useMetrics';

interface Props {
  data: MetricsOverview;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-office-panel border border-office-border rounded-lg p-4 flex flex-col gap-1">
      <span className="font-pixel text-[7px] text-office-muted uppercase">{label}</span>
      <span className={`font-pixel text-[14px] ${color || 'text-office-text'}`}>{value}</span>
      {sub && <span className="font-pixel text-[6px] text-office-muted">{sub}</span>}
    </div>
  );
}

export default function OverviewCards({ data }: Props) {
  const successRate = data.missions.total > 0
    ? Math.round((data.missions.succeeded / data.missions.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Total Missions"
        value={data.missions.total}
        sub={`${data.missions.running} running`}
        color="text-blue-400"
      />
      <StatCard
        label="Success Rate"
        value={`${successRate}%`}
        sub={`${data.missions.succeeded}/${data.missions.total}`}
        color={successRate > 70 ? 'text-green-400' : successRate > 40 ? 'text-yellow-400' : 'text-red-400'}
      />
      <StatCard
        label="Active Agents"
        value={`${data.agents.working}/${data.agents.total}`}
        sub={`${data.agents.idle} idle`}
        color="text-purple-400"
      />
      <StatCard
        label="Total Cost"
        value={`$${data.cost.totalCost.toFixed(4)}`}
        sub={`${((data.cost.totalTokensIn + data.cost.totalTokensOut) / 1000).toFixed(1)}k tokens`}
        color="text-office-accent"
      />
    </div>
  );
}
