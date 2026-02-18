'use client';

import type { CostData } from '@/hooks/useMetrics';
import type { AgentFull } from '@/hooks/useAgents';

interface Props {
  data: CostData;
  agents: Record<string, AgentFull>;
}

export default function CostBreakdown({ data, agents }: Props) {
  const entries = Object.entries(data.byAgent)
    .sort(([, a], [, b]) => b.cost - a.cost);

  const budgetThreshold = 1.0; // $1.00 alert threshold

  return (
    <div className="bg-office-panel border border-office-border rounded-lg p-4">
      <h3 className="font-pixel text-[9px] text-office-accent mb-3">COST BY AGENT</h3>

      {data.total > budgetThreshold && (
        <div className="bg-red-900/30 border border-red-500/50 rounded px-3 py-2 mb-3 font-pixel text-[7px] text-red-400">
          ⚠ BUDGET ALERT: Total spend ${data.total.toFixed(4)} exceeds ${budgetThreshold.toFixed(2)} threshold
        </div>
      )}

      <div className="space-y-2">
        {entries.length === 0 && (
          <div className="text-office-muted font-pixel text-[8px]">NO COST DATA</div>
        )}
        {entries.map(([agentId, stats]) => {
          const agent = agents[agentId];
          const name = agent?.agent.name || agentId.slice(0, 8);
          const pct = data.total > 0 ? (stats.cost / data.total) * 100 : 0;
          return (
            <div key={agentId} className="flex items-center gap-2">
              <span className="font-pixel text-[7px] text-office-text w-20 truncate">{name}</span>
              <div className="flex-1 h-3 bg-office-bg rounded overflow-hidden">
                <div
                  className="h-full bg-office-accent transition-all"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="font-pixel text-[7px] text-office-muted w-16 text-right">
                ${stats.cost.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-office-border flex justify-between font-pixel text-[8px]">
        <span className="text-office-muted">TOTAL</span>
        <span className="text-office-accent">${data.total.toFixed(4)}</span>
      </div>
    </div>
  );
}
