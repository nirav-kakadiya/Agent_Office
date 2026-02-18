'use client';

import { useState } from 'react';
import { useMissions } from '@/hooks/useMissions';
import type { MissionStatus } from '@agent-office/shared';

const STATUSES: (MissionStatus | 'all')[] = ['all', 'pending', 'running', 'succeeded', 'failed'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-600',
  running: 'bg-blue-600',
  succeeded: 'bg-green-700',
  failed: 'bg-red-700',
};

export default function MissionsPage() {
  const { missions, loading } = useMissions();
  const [filter, setFilter] = useState<MissionStatus | 'all'>('all');

  const filtered = filter === 'all' ? missions : missions.filter((m) => m.status === filter);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-pixel text-sm text-office-accent mb-6">MISSIONS</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-xs rounded font-pixel text-[8px] transition-colors ${
              filter === s ? 'bg-office-accent text-white' : 'bg-office-panel text-office-muted hover:text-office-text'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-office-muted text-xs animate-pulse">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-office-muted text-xs">No missions found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="bg-office-panel border border-office-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[8px] font-pixel text-white ${STATUS_COLORS[m.status] || 'bg-gray-600'}`}>
                  {m.status}
                </span>
                <span className="text-xs text-office-text font-mono">{m.id.slice(0, 12)}...</span>
                <span className="text-xs text-office-muted ml-auto">Priority: {m.priority}</span>
              </div>
              <div className="mt-2 text-[10px] text-office-muted flex gap-4">
                <span>Created: {new Date(m.created_at).toLocaleString()}</span>
                {m.completed_at && <span>Completed: {new Date(m.completed_at).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
