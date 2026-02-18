'use client';

import type { MissionWithSteps } from '@/hooks/useMissions';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-gray-600 text-gray-200',
  running: 'bg-blue-600 text-blue-100',
  succeeded: 'bg-green-700 text-green-100',
  failed: 'bg-red-700 text-red-100',
};

export default function MissionBoard({ missions }: { missions: MissionWithSteps[] }) {
  if (missions.length === 0) {
    return <div className="p-4 text-office-muted text-xs text-center">No missions</div>;
  }

  return (
    <div className="overflow-y-auto max-h-48 space-y-1 p-2">
      {missions.slice(0, 20).map((m) => (
        <div key={m.id} className="flex items-center gap-2 text-[10px] py-1 border-b border-office-border/30">
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-pixel ${STATUS_BADGE[m.status] || ''}`}>
            {m.status}
          </span>
          <span className="text-office-text truncate">{m.id.slice(0, 8)}</span>
          <span className="text-office-muted ml-auto">P{m.priority}</span>
        </div>
      ))}
    </div>
  );
}
