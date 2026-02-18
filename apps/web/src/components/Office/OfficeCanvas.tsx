'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { AgentFull } from '@/hooks/useAgents';
import { CANVAS_W, CANVAS_H, CELL_SIZE, ROOMS } from '@/lib/constants';

type PixiMod = typeof import('pixi.js');
type AgentSpriteClass = typeof import('./AgentSprite').AgentSprite;

interface Props {
  agents: Record<string, AgentFull>;
  onAgentClick?: (agentId: string) => void;
}

export default function OfficeCanvas({ agents, onAgentClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<InstanceType<PixiMod['Application']> | null>(null);
  const spritesRef = useRef<Map<string, InstanceType<AgentSpriteClass>>>(new Map());
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  const init = useCallback(async () => {
    if (!containerRef.current || appRef.current) return;

    const PIXI = await import('pixi.js');
    const { AgentSprite } = await import('./AgentSprite');

    const app = new PIXI.Application();
    await app.init({
      width: CANVAS_W,
      height: CANVAS_H,
      background: 0x111122,
      antialias: false,
      resolution: 1,
    });
    appRef.current = app;
    containerRef.current.appendChild(app.canvas as HTMLCanvasElement);

    // Draw rooms
    const roomLayer = new PIXI.Container();
    for (const room of ROOMS) {
      const g = new PIXI.Graphics();
      const x = room.x * CELL_SIZE;
      const y = room.y * CELL_SIZE;
      const w = room.w * CELL_SIZE;
      const h = room.h * CELL_SIZE;

      // Fill
      g.rect(x + 1, y + 1, w - 2, h - 2).fill({ color: room.color, alpha: 0.15 });
      // Border
      g.rect(x, y, w, h).stroke({ color: room.color, alpha: 0.4, width: 1 });
      roomLayer.addChild(g);

      // Label
      const label = new PIXI.Text({
        text: room.label,
        style: new PIXI.TextStyle({
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 8,
          fill: room.color,
          align: 'center',
        }),
      });
      label.anchor.set(0.5, 0);
      label.x = x + w / 2;
      label.y = y + 4;
      label.alpha = 0.6;
      roomLayer.addChild(label);

      // Server room blinking dots
      if (room.name === 'server') {
        for (let i = 0; i < 6; i++) {
          const dot = new PIXI.Graphics();
          dot.circle(0, 0, 2).fill(0x44ff44);
          dot.x = x + 20 + (i % 3) * 30;
          dot.y = y + h / 2 + Math.floor(i / 3) * 15;
          dot.alpha = 0.3;
          roomLayer.addChild(dot);
          // Blink
          app.ticker.add(() => {
            dot.alpha = 0.2 + Math.sin(Date.now() * 0.003 + i * 1.5) * 0.5;
          });
        }
      }
    }

    // Grid lines
    const gridLayer = new PIXI.Graphics();
    gridLayer.setStrokeStyle({ color: 0x334455, alpha: 0.15, width: 1 });
    for (let c = 0; c <= 16; c++) {
      gridLayer.moveTo(c * CELL_SIZE, 0).lineTo(c * CELL_SIZE, CANVAS_H).stroke();
    }
    for (let r = 0; r <= 12; r++) {
      gridLayer.moveTo(0, r * CELL_SIZE).lineTo(CANVAS_W, r * CELL_SIZE).stroke();
    }

    app.stage.addChild(gridLayer);
    app.stage.addChild(roomLayer);

    // Agent sprites container
    const agentLayer = new PIXI.Container();
    app.stage.addChild(agentLayer);

    // Create agent sprites
    const current = agentsRef.current;
    for (const [id, data] of Object.entries(current)) {
      const sprite = new AgentSprite(id, data.agent.name);
      sprite.setPosition(data.office?.x ?? 0, data.office?.y ?? 0);
      sprite.setStatus(data.agent.status);
      sprite.setMood(data.affect?.mood ?? 'neutral');
      sprite.container.on('pointerdown', () => onAgentClick?.(id));
      agentLayer.addChild(sprite.container);
      spritesRef.current.set(id, sprite);
    }

    // Ticker
    app.ticker.add((ticker) => {
      const dt = ticker.deltaTime;
      for (const [id, sprite] of spritesRef.current) {
        const data = agentsRef.current[id];
        if (data) {
          sprite.setPosition(data.office?.x ?? 0, data.office?.y ?? 0);
          sprite.setStatus(data.agent.status);
          sprite.setMood(data.affect?.mood ?? 'neutral');
        }
        sprite.update(dt);
      }
    });
  }, [onAgentClick]);

  useEffect(() => {
    init();
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [init]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-office-border"
        style={{ width: CANVAS_W, maxWidth: '100%', imageRendering: 'pixelated' }}
      />
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
        }}
      />
    </div>
  );
}
