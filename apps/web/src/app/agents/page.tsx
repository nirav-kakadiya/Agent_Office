'use client';

import { useAgents } from '@/hooks/useAgents';
import { AGENT_COLORS } from '@/lib/constants';

function hexColor(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export default function AgentsPage() {
  const { agents, loading } = useAgents();

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-office-muted text-xs animate-pulse">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-pixel text-sm text-office-accent mb-6">AGENTS</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(agents).map(([id, data]) => {
          const color = hexColor(AGENT_COLORS[id] || 0xaaaaaa);
          return (
            <div
              key={id}
              className="bg-office-panel border border-office-border rounded-lg p-4 hover:border-office-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-pixel text-[10px] text-white"
                  style={{ backgroundColor: color, borderColor: color }}
                >
                  {data.agent.name[0]}
                </div>
                <div>
                  <h2 className="font-pixel text-[10px]" style={{ color }}>{data.agent.name}</h2>
                  <p className="text-[10px] text-office-muted">{data.agent.role}</p>
                </div>
              </div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-office-muted">Status</span>
                  <span className="text-office-text">{data.agent.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-office-muted">Mood</span>
                  <span className="text-office-text">{data.affect?.mood ?? 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-office-muted">Energy</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-office-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${data.affect?.energy ?? 0}%` }}
                      />
                    </div>
                    <span className="text-office-text">{data.affect?.energy ?? 0}%</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-office-muted">Room</span>
                  <span className="text-office-text">{data.office?.room ?? 'unknown'}</span>
                </div>
              </div>

              {data.agent.personality && (
                <p className="mt-3 text-[9px] text-office-muted italic border-t border-office-border/30 pt-2">
                  &ldquo;{data.agent.personality}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
