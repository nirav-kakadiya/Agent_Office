'use client';

import type { AgentEvent } from '@agent-office/shared';

const TYPE_COLORS: Record<string, string> = {
  mission_started: 'text-blue-400',
  mission_completed: 'text-green-400',
  mission_failed: 'text-red-400',
  step_completed: 'text-green-300',
  step_failed: 'text-red-300',
  trigger_fired: 'text-yellow-400',
  reaction_fired: 'text-purple-400',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ActivityFeed({ events }: { events: AgentEvent[] }) {
  if (events.length === 0) {
    return <div className="p-4 text-office-muted text-xs text-center">No events yet</div>;
  }

  return (
    <div className="overflow-y-auto max-h-64 space-y-1 p-2">
      {events.map((ev) => (
        <div key={ev.id} className="flex gap-2 text-[10px] py-1 border-b border-office-border/30">
          <span className="text-office-muted shrink-0">{formatTime(ev.created_at)}</span>
          <span className="text-office-accent font-bold shrink-0">{ev.agent_id}</span>
          <span className={TYPE_COLORS[ev.event_type] || 'text-office-text'}>
            {ev.event_type.replace(/_/g, ' ')}
          </span>
        </div>
      ))}
    </div>
  );
}
