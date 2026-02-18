'use client';

import { useState, useMemo } from 'react';
import type { AgentEvent } from '@agent-office/shared';
import type { AgentFull } from '@/hooks/useAgents';
import { useEvents } from '@/hooks/useEvents';

interface Props {
  agents: Record<string, AgentFull>;
}

const SEVERITY_COLORS: Record<string, string> = {
  error: 'text-red-400 border-l-red-400',
  warning: 'text-yellow-400 border-l-yellow-400',
  success: 'text-green-400 border-l-green-400',
  info: 'text-blue-400 border-l-blue-400',
};

function getSeverity(event: AgentEvent): string {
  const t = event.event_type.toLowerCase();
  if (t.includes('error') || t.includes('fail')) return 'error';
  if (t.includes('warn')) return 'warning';
  if (t.includes('success') || t.includes('complete')) return 'success';
  return 'info';
}

export default function LiveFeed({ agents }: Props) {
  const { events, loading } = useEvents(100);
  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const agentIds = useMemo(() => ['all', ...Object.keys(agents)], [agents]);
  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.event_type));
    return ['all', ...Array.from(types)];
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter !== 'all' && e.agent_id !== filter) return false;
      if (typeFilter !== 'all' && e.event_type !== typeFilter) return false;
      return true;
    });
  }, [events, filter, typeFilter]);

  return (
    <div className="bg-office-panel border border-office-border rounded-lg p-4 flex flex-col h-80">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h3 className="font-pixel text-[9px] text-office-accent">LIVE FEED</h3>
        <div className="ml-auto flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-office-bg border border-office-border rounded px-2 py-1 font-pixel text-[6px] text-office-text"
          >
            {agentIds.map((id) => (
              <option key={id} value={id}>
                {id === 'all' ? 'ALL AGENTS' : (agents[id]?.agent.name || id.slice(0, 8))}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-office-bg border border-office-border rounded px-2 py-1 font-pixel text-[6px] text-office-text"
          >
            {eventTypes.map((t) => (
              <option key={t} value={t}>{t === 'all' ? 'ALL TYPES' : t.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {loading && <div className="font-pixel text-[8px] text-office-muted">LOADING...</div>}
        {!loading && filtered.length === 0 && (
          <div className="font-pixel text-[8px] text-office-muted">NO EVENTS</div>
        )}
        {filtered.map((event) => {
          const severity = getSeverity(event);
          const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;
          const agentName = agents[event.agent_id]?.agent.name || event.agent_id.slice(0, 8);
          const time = new Date(event.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

          return (
            <div key={event.id} className={`border-l-2 pl-2 py-1 ${colors}`}>
              <div className="flex items-center gap-2 font-pixel text-[6px]">
                <span className="text-office-muted">{time}</span>
                <span className="text-office-text">{agentName}</span>
                <span className={colors.split(' ')[0]}>{event.event_type}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
