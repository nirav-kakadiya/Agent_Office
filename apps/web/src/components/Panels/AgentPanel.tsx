'use client';

import type { AgentFull } from '@/hooks/useAgents';
import { AGENT_COLORS } from '@/lib/constants';

function hexColor(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export default function AgentPanel({ agent: data }: { agent: AgentFull | null }) {
  if (!data) {
    return (
      <div className="p-4 text-office-muted font-pixel text-[8px] text-center">
        Click an agent to view details
      </div>
    );
  }

  const { agent, affect, office } = data;
  const color = hexColor(AGENT_COLORS[agent.id] || 0xaaaaaa);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2"
          style={{ backgroundColor: color, borderColor: color }}
        />
        <div>
          <h3 className="font-pixel text-xs" style={{ color }}>{agent.name}</h3>
          <p className="text-office-muted text-xs">{agent.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Status" value={agent.status} />
        <Stat label="Mood" value={affect?.mood ?? 'unknown'} />
        <Stat label="Energy" value={`${affect?.energy ?? 0}%`} />
        <Stat label="Room" value={office?.room ?? 'unknown'} />
        <Stat label="Activity" value={office?.activity ?? 'idle'} />
        <Stat label="Position" value={`(${office?.x ?? 0}, ${office?.y ?? 0})`} />
      </div>

      {agent.personality && (
        <p className="text-[10px] text-office-muted italic">&ldquo;{agent.personality}&rdquo;</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-office-bg/50 rounded px-2 py-1">
      <span className="text-office-muted">{label}: </span>
      <span className="text-office-text">{value}</span>
    </div>
  );
}
