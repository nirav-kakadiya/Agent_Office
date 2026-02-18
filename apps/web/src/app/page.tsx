'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAgents } from '@/hooks/useAgents';
import { useMissions } from '@/hooks/useMissions';
import { useEvents } from '@/hooks/useEvents';
import AgentPanel from '@/components/Panels/AgentPanel';
import ActivityFeed from '@/components/Panels/ActivityFeed';
import MissionBoard from '@/components/Panels/MissionBoard';
import StatsBar from '@/components/Panels/StatsBar';

const OfficeCanvas = dynamic(() => import('@/components/Office/OfficeCanvas'), { ssr: false });

export default function HomePage() {
  const { agents, loading: agentsLoading } = useAgents();
  const { missions } = useMissions();
  const { events } = useEvents();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen">
      <StatsBar missions={missions} agents={agents} />

      <div className="flex flex-1 overflow-hidden max-md:flex-col">
        {/* Canvas (60%) */}
        <div className="flex-[3] flex items-center justify-center p-4 overflow-auto">
          {agentsLoading ? (
            <div className="font-pixel text-[10px] text-office-muted animate-pulse">
              Loading agents...
            </div>
          ) : (
            <OfficeCanvas agents={agents} onAgentClick={setSelectedAgent} />
          )}
        </div>

        {/* Panels (40%) */}
        <div className="flex-[2] border-l border-office-border max-md:border-l-0 max-md:border-t overflow-y-auto">
          {/* Agent Detail */}
          <section className="border-b border-office-border">
            <h2 className="font-pixel text-[8px] text-office-muted px-4 pt-3 pb-1">AGENT</h2>
            <AgentPanel agent={selectedAgent ? agents[selectedAgent] ?? null : null} />
          </section>

          {/* Activity Feed */}
          <section className="border-b border-office-border">
            <h2 className="font-pixel text-[8px] text-office-muted px-4 pt-3 pb-1">ACTIVITY</h2>
            <ActivityFeed events={events} />
          </section>

          {/* Mission Board */}
          <section>
            <h2 className="font-pixel text-[8px] text-office-muted px-4 pt-3 pb-1">MISSIONS</h2>
            <MissionBoard missions={missions} />
          </section>
        </div>
      </div>
    </div>
  );
}
