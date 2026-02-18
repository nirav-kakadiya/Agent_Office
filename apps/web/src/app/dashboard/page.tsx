'use client';

import { useMetricsOverview, useCostData, useTimelineData } from '@/hooks/useMetrics';
import { useAgents } from '@/hooks/useAgents';
import OverviewCards from '@/components/Dashboard/OverviewCards';
import MissionChart from '@/components/Dashboard/MissionChart';
import ProposalChart from '@/components/Dashboard/ProposalChart';
import CostChart from '@/components/Dashboard/CostChart';
import CostBreakdown from '@/components/Dashboard/CostBreakdown';
import AgentPerformanceCards from '@/components/Dashboard/AgentPerformanceCards';
import LiveFeed from '@/components/Dashboard/LiveFeed';

export default function DashboardPage() {
  const { data: overview, loading: overviewLoading } = useMetricsOverview();
  const { data: costData, loading: costLoading } = useCostData();
  const { data: timeline, loading: timelineLoading } = useTimelineData(30);
  const { agents } = useAgents();

  const loading = overviewLoading || costLoading || timelineLoading;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-[12px] text-office-accent">📊 METRICS DASHBOARD</h1>
        <div className="font-pixel text-[7px] text-office-muted">
          {loading ? 'LOADING...' : 'LIVE • AUTO-REFRESH 15s'}
        </div>
      </div>

      {/* Scanline overlay effect */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
      }} />

      {/* Overview Stats */}
      {overview && <OverviewCards data={overview} />}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {timeline && <MissionChart data={timeline} />}
        {timeline && <ProposalChart data={timeline} />}
      </div>

      {/* Cost Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {costData && <CostChart data={costData} />}
        {costData && <CostBreakdown data={costData} agents={agents} />}
      </div>

      {/* Agent Performance */}
      {overview && <AgentPerformanceCards agents={agents} overview={overview} />}

      {/* Live Feed */}
      <LiveFeed agents={agents} />
    </div>
  );
}
