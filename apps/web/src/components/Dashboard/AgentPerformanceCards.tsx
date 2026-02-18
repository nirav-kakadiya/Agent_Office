'use client';

import type { MetricsOverview } from '@/hooks/useMetrics';
import type { AgentFull } from '@/hooks/useAgents';

interface Props {
  agents: Record<string, AgentFull>;
  overview: MetricsOverview;
}

function TrendArrow({ value }: { value: number }) {
  if (value > 0) return <span className="text-green-400">▲</span>;
  if (value < 0) return <span className="text-red-400">▼</span>;
  return <span className="text-office-muted">─</span>;
}

function EnergyBar({ energy }: { energy: number }) {
  const pct = Math.max(0, Math.min(100, energy));
  const color = pct > 60 ? 'bg-green-400' : pct > 30 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="w-full h-2 bg-office-bg rounded overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AgentPerformanceCards({ agents, overview }: Props) {
  const agentList = Object.values(agents);

  if (agentList.length === 0) {
    return (
      <div className="bg-office-panel border border-office-border rounded-lg p-4">
        <h3 className="font-pixel text-[9px] text-office-accent mb-3">AGENT PERFORMANCE</h3>
        <div className="text-office-muted font-pixel text-[8px]">NO AGENTS</div>
      </div>
    );
  }

  return (
    <div className="bg-office-panel border border-office-border rounded-lg p-4">
      <h3 className="font-pixel text-[9px] text-office-accent mb-3">AGENT PERFORMANCE</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {agentList.map(({ agent, affect }) => {
          const isWorking = agent.status === 'working';
          const energy = affect?.energy ?? 50;

          return (
            <div
              key={agent.id}
              className="bg-office-bg border border-office-border rounded-lg p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isWorking ? 'bg-green-400 animate-pulse' : 'bg-office-muted'}`} />
                <span className="font-pixel text-[8px] text-office-text truncate">{agent.name}</span>
                <TrendArrow value={isWorking ? 1 : 0} />
              </div>

              <div className="font-pixel text-[6px] text-office-muted">{agent.role}</div>

              <div className="flex justify-between font-pixel text-[6px]">
                <span className="text-office-muted">STATUS</span>
                <span className={isWorking ? 'text-green-400' : 'text-office-muted'}>{agent.status.toUpperCase()}</span>
              </div>

              {affect && (
                <div className="flex justify-between font-pixel text-[6px]">
                  <span className="text-office-muted">MOOD</span>
                  <span className="text-office-text">{affect.mood}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="font-pixel text-[6px] text-office-muted shrink-0">ENERGY</span>
                <EnergyBar energy={energy} />
                <span className="font-pixel text-[6px] text-office-muted">{energy}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
