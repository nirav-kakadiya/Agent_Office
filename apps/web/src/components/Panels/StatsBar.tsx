'use client';

import type { MissionWithSteps } from '@/hooks/useMissions';
import type { AgentFull } from '@/hooks/useAgents';

interface Props {
  missions: MissionWithSteps[];
  agents: Record<string, AgentFull>;
}

export default function StatsBar({ missions, agents }: Props) {
  const total = missions.length;
  const succeeded = missions.filter((m) => m.status === 'succeeded').length;
  const rate = total > 0 ? Math.round((succeeded / total) * 100) : 0;
  const active = Object.values(agents).filter((a) => a.agent.status === 'working').length;

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-office-panel border-b border-office-border font-pixel text-[8px]">
      <StatItem label="MISSIONS" value={String(total)} />
      <StatItem label="SUCCESS" value={`${rate}%`} color={rate > 70 ? 'text-green-400' : 'text-yellow-400'} />
      <StatItem label="ACTIVE" value={String(active)} color="text-blue-400" />
      <div className="ml-auto text-office-muted">AGENT OFFICE</div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-office-muted">{label}</span>
      <span className={color || 'text-office-text'}>{value}</span>
    </div>
  );
}
