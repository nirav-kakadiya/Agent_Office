'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { AgentFull } from '@/hooks/useAgents';
import { CANVAS_W, CANVAS_H, CELL_SIZE, ROOMS, RoomDef } from '@/lib/constants';

type PixiMod = typeof import('pixi.js');
type AgentSpriteClass = typeof import('./AgentSprite').AgentSprite;

interface Props {
  agents: Record<string, AgentFull>;
  onAgentClick?: (agentId: string) => void;
}

/* ── helper: darken a hex color ── */
function darken(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8) & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
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
      background: 0xd8e4f0,
      antialias: false,
      resolution: 1,
    });
    appRef.current = app;
    containerRef.current.appendChild(app.canvas as HTMLCanvasElement);

    /* ────────────────────── Background gradient ────────────────────── */
    const bgGrad = new PIXI.Graphics();
    // Top: light blue, bottom: warm cream
    bgGrad.rect(0, 0, CANVAS_W, CANVAS_H / 2).fill(0xd8e8f4);
    bgGrad.rect(0, CANVAS_H / 2, CANVAS_W, CANVAS_H / 2).fill(0xe4ddd0);
    bgGrad.alpha = 0.5;
    app.stage.addChild(bgGrad);

    /* ────────────────────── Room layer ────────────────────── */
    const roomLayer = new PIXI.Container();

    for (const room of ROOMS) {
      const x = room.x * CELL_SIZE;
      const y = room.y * CELL_SIZE;
      const w = room.w * CELL_SIZE;
      const h = room.h * CELL_SIZE;

      // Floor with checkerboard
      const floor = new PIXI.Graphics();
      for (let cy = 0; cy < room.h; cy++) {
        for (let cx = 0; cx < room.w; cx++) {
          const tileC = (cx + cy) % 2 === 0 ? room.floorColor : darken(room.floorColor, 0.93);
          floor.rect(x + cx * CELL_SIZE, y + cy * CELL_SIZE, CELL_SIZE, CELL_SIZE).fill(tileC);
        }
      }
      roomLayer.addChild(floor);

      // Wall top strip
      const wall = new PIXI.Graphics();
      wall.rect(x, y, w, 14).fill(room.wallColor);
      wall.rect(x, y + 13, w, 1).fill(darken(room.wallColor, 0.85));
      roomLayer.addChild(wall);

      // Room border
      const border = new PIXI.Graphics();
      border.rect(x, y, w, h).stroke({ color: darken(room.color, 0.6), alpha: 0.5, width: 1 });
      roomLayer.addChild(border);

      // Room label
      const label = new PIXI.Text({
        text: room.label,
        style: new PIXI.TextStyle({
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 7,
          fill: darken(room.color, 0.7),
          align: 'center',
        }),
      });
      label.anchor.set(0.5, 0);
      label.x = x + w / 2;
      label.y = y + 3;
      label.alpha = 0.8;
      roomLayer.addChild(label);

      // Draw room-specific furniture
      const furniture = new PIXI.Graphics();
      drawRoomFurniture(furniture, room, x, y, w, h);
      roomLayer.addChild(furniture);

      // Animated elements per room
      drawAnimatedElements(app, roomLayer, room, x, y, w, h, PIXI);
    }

    /* ────────────────────── Window with sunlight (left wall) ────────────────────── */
    const windowG = new PIXI.Graphics();
    // Window frame
    windowG.rect(2, 20, 4, 60).fill(0x88bbee);
    windowG.rect(2, 20, 4, 60).stroke({ color: 0x776655, width: 2 });
    windowG.rect(2, 49, 4, 2).fill(0x776655);
    // Sunlight rays
    const rays = new PIXI.Graphics();
    rays.moveTo(6, 25).lineTo(60, 15).lineTo(60, 85).lineTo(6, 75).closePath();
    rays.fill({ color: 0xffffcc, alpha: 0.06 });
    roomLayer.addChild(rays);
    roomLayer.addChild(windowG);

    /* ────────────────────── Potted plants in some rooms ────────────────────── */
    drawPottedPlant(roomLayer, PIXI, 235, 150);  // library area
    drawPottedPlant(roomLayer, PIXI, 490, 350);  // meeting room
    drawPottedPlant(roomLayer, PIXI, 380, 540);  // coffee area

    /* ────────────────────── Grid lines (subtle) ────────────────────── */
    const gridLayer = new PIXI.Graphics();
    for (let c = 0; c <= 16; c++) {
      gridLayer.moveTo(c * CELL_SIZE, 0).lineTo(c * CELL_SIZE, CANVAS_H).stroke({ color: 0x998877, alpha: 0.08, width: 1 });
    }
    for (let r = 0; r <= 12; r++) {
      gridLayer.moveTo(0, r * CELL_SIZE).lineTo(CANVAS_W, r * CELL_SIZE).stroke({ color: 0x998877, alpha: 0.08, width: 1 });
    }

    app.stage.addChild(gridLayer);
    app.stage.addChild(roomLayer);

    /* ────────────────────── Agent sprites ────────────────────── */
    const agentLayer = new PIXI.Container();
    app.stage.addChild(agentLayer);

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

    /* ────────────────────── Main ticker ────────────────────── */
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
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM FURNITURE DRAWING FUNCTIONS
   ══════════════════════════════════════════════════════════ */

function drawRoomFurniture(g: InstanceType<PixiMod['Graphics']>, room: RoomDef, x: number, y: number, w: number, h: number) {
  switch (room.name) {
    case 'workshop':
      drawWorkshop(g, x, y, w, h);
      break;
    case 'library':
      drawLibrary(g, x, y, w, h);
      break;
    case 'watchtower':
      drawWatchtower(g, x, y, w, h);
      break;
    case 'studio':
      drawStudio(g, x, y, w, h);
      break;
    case 'meeting':
      drawMeeting(g, x, y, w, h);
      break;
    case 'lab':
      drawLab(g, x, y, w, h);
      break;
    case 'field':
      drawField(g, x, y, w, h);
      break;
    case 'coffee':
      drawCoffee(g, x, y, w, h);
      break;
    case 'server':
      drawServer(g, x, y, w, h);
      break;
  }
}

function drawDesk(g: InstanceType<PixiMod['Graphics']>, dx: number, dy: number, dw: number, dh: number) {
  // Desk surface
  g.rect(dx, dy, dw, dh).fill(0x8B6914);
  g.rect(dx, dy, dw, 2).fill(0xa07820);
  // Legs
  g.rect(dx + 2, dy + dh, 3, 8).fill(0x6b5010);
  g.rect(dx + dw - 5, dy + dh, 3, 8).fill(0x6b5010);
  // Shadow
  g.rect(dx + 2, dy + dh + 8, dw - 4, 2).fill({ color: 0x000000, alpha: 0.1 });
}

function drawMonitor(g: InstanceType<PixiMod['Graphics']>, mx: number, my: number, screenColor: number) {
  // Monitor body
  g.rect(mx, my, 24, 18).fill(0x333333);
  // Screen
  g.rect(mx + 2, my + 2, 20, 12).fill(screenColor);
  // Stand
  g.rect(mx + 9, my + 18, 6, 4).fill(0x444444);
  g.rect(mx + 6, my + 22, 12, 2).fill(0x444444);
}

function drawChair(g: InstanceType<PixiMod['Graphics']>, cx: number, cy: number, color: number) {
  // Seat
  g.rect(cx, cy, 14, 6).fill(color);
  // Back
  g.rect(cx + 1, cy - 10, 12, 10).fill(darken(color, 0.85));
  // Legs
  g.rect(cx + 2, cy + 6, 2, 6).fill(0x444444);
  g.rect(cx + 10, cy + 6, 2, 6).fill(0x444444);
  // Wheels
  g.circle(cx + 3, cy + 13, 2).fill(0x333333);
  g.circle(cx + 11, cy + 13, 2).fill(0x333333);
}

function drawWorkshop(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, _w: number, h: number) {
  const bx = x + 15, by = y + 30;
  // Desk
  drawDesk(g, bx, by + 40, 60, 8);
  // Monitor with green screen
  drawMonitor(g, bx + 18, by + 16, 0x003300);
  // Green text lines on monitor
  for (let i = 0; i < 4; i++) {
    g.rect(bx + 22, by + 20 + i * 3, 8 + (i % 2) * 4, 1).fill(0x00ff00);
  }
  // Keyboard
  g.rect(bx + 16, by + 42, 28, 5).fill(0x222222);
  g.rect(bx + 17, by + 43, 26, 3).fill(0x333333);
  // Scattered papers
  g.rect(bx + 55, by + 42, 10, 7).fill(0xffffff);
  g.rect(bx + 57, by + 44, 6, 1).fill(0xcccccc);
  g.rect(bx + 57, by + 46, 4, 1).fill(0xcccccc);
  g.rect(bx + 52, by + 44, 8, 6).fill(0xfffff0);
  // Toolbox
  g.rect(x + 160, y + h - 40, 20, 14).fill(0xcc4444);
  g.rect(x + 160, y + h - 40, 20, 3).fill(0xdd5555);
  g.rect(x + 168, y + h - 43, 4, 3).fill(0xaa3333);
}

function drawLibrary(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, w: number, _h: number) {
  // Bookshelf on wall
  const sx = x + 10, sy = y + 14;
  // Shelf frame
  g.rect(sx, sy, 80, 60).fill(0x6b4226);
  g.rect(sx + 2, sy + 2, 76, 56).fill(0x7b5236);
  // Shelf dividers
  for (let i = 0; i < 3; i++) {
    g.rect(sx, sy + 18 * (i + 1), 80, 2).fill(0x5a3618);
  }
  // Books on shelves — colored spines
  const bookColors = [0xcc3333, 0x3366cc, 0x33aa33, 0xccaa33, 0x9944aa, 0xcc6633, 0x4488aa, 0x338844];
  for (let shelf = 0; shelf < 3; shelf++) {
    let bx = sx + 4;
    for (let b = 0; b < 7; b++) {
      const bw = 5 + (b % 3) * 2;
      const bh = 14 + (b % 2) * 2;
      const color = bookColors[(shelf * 7 + b) % bookColors.length];
      g.rect(bx, sy + 3 + shelf * 18 + (16 - bh), bw, bh).fill(color);
      // Spine line
      g.rect(bx + 1, sy + 5 + shelf * 18 + (16 - bh), bw - 2, 1).fill({ color: 0xffffff, alpha: 0.2 });
      bx += bw + 1;
    }
  }
  // Reading lamp
  const lx = x + w * CELL_SIZE - 40, ly = y + 50;
  g.rect(lx + 5, ly, 3, 30).fill(0x888888);
  g.rect(lx, ly - 4, 14, 6).fill(0xffcc44);
  g.ellipse(lx + 7, ly + 31, 8, 3).fill(0x666666);
  // Stack of books on floor
  g.rect(x + 100, y + 160, 18, 4).fill(0x4466aa);
  g.rect(x + 98, y + 156, 20, 4).fill(0xaa4433);
  g.rect(x + 101, y + 152, 16, 4).fill(0x44aa66);
}

function drawWatchtower(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, w: number, _h: number) {
  const ww = w * CELL_SIZE;
  // Multiple monitors on wall
  for (let i = 0; i < 3; i++) {
    const mx = x + 20 + i * 70;
    drawMonitor(g, mx, y + 18, 0x001133);
    // Content on screens
    // Waveform
    for (let j = 0; j < 8; j++) {
      const sh = 3 + Math.sin(i * 2 + j * 0.8) * 3;
      g.rect(mx + 4 + j * 2, y + 26 - sh, 1, sh * 2).fill(0x44aaff);
    }
  }
  // Desk
  drawDesk(g, x + 30, y + 100, ww - 60, 8);
  // Radar dish
  const rx = x + ww - 50, ry = y + 55;
  g.moveTo(rx, ry + 20).lineTo(rx + 10, ry).lineTo(rx + 20, ry + 20).closePath().fill(0x888888);
  g.rect(rx + 9, ry + 20, 3, 15).fill(0x666666);
  g.ellipse(rx + 10, ry + 36, 8, 3).fill(0x555555);
}

function drawStudio(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, _w: number, h: number) {
  // Easel
  const ex = x + 20, ey = y + 30;
  // Legs
  g.moveTo(ex + 15, ey).lineTo(ex + 5, ey + 70).stroke({ color: 0x6b4226, width: 2 });
  g.moveTo(ex + 15, ey).lineTo(ex + 25, ey + 70).stroke({ color: 0x6b4226, width: 2 });
  g.moveTo(ex + 15, ey + 10).lineTo(ex + 35, ey + 60).stroke({ color: 0x6b4226, width: 2 });
  // Canvas on easel
  g.rect(ex + 2, ey, 26, 30).fill(0xffffff);
  g.rect(ex + 2, ey, 26, 30).stroke({ color: 0x8B6914, width: 1 });
  // Art on canvas — abstract shapes
  g.circle(ex + 12, ey + 10, 5).fill(0xff6644);
  g.rect(ex + 18, ey + 14, 8, 8).fill(0x4488ff);
  g.star(ex + 10, ey + 22, 5, 4, 2).fill(0xffcc00);

  // Paint palette
  g.ellipse(x + 130, y + 140, 18, 12).fill(0x8B6914);
  g.circle(x + 122, y + 136, 3).fill(0xff3333);
  g.circle(x + 130, y + 133, 3).fill(0x3366ff);
  g.circle(x + 138, y + 136, 3).fill(0xffcc00);
  g.circle(x + 126, y + 143, 3).fill(0x33cc33);
  g.circle(x + 134, y + 144, 3).fill(0xff66cc);

  // Paint splatters on floor
  g.circle(x + 60, y + h * CELL_SIZE - 30, 4).fill({ color: 0xff3333, alpha: 0.3 });
  g.circle(x + 100, y + h * CELL_SIZE - 20, 3).fill({ color: 0x3366ff, alpha: 0.3 });
  g.circle(x + 80, y + h * CELL_SIZE - 15, 5).fill({ color: 0xffcc00, alpha: 0.25 });

  // Laptop
  drawDesk(g, x + 100, y + 80, 50, 6);
  g.rect(x + 112, y + 64, 26, 18).fill(0x333333);
  g.rect(x + 114, y + 66, 22, 14).fill(0x220044);
  g.rect(x + 110, y + 82, 30, 2).fill(0x444444);
}

function drawMeeting(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, w: number, h: number) {
  const ww = w * CELL_SIZE;
  const hh = h * CELL_SIZE;
  // Large table
  g.roundRect(x + 40, y + 60, ww - 80, hh - 110, 4).fill(0x7b5236);
  g.roundRect(x + 42, y + 62, ww - 84, hh - 114, 3).fill(0x8b6246);
  // Table legs
  g.rect(x + 44, y + hh - 48, 4, 10).fill(0x5a3618);
  g.rect(x + ww - 48, y + hh - 48, 4, 10).fill(0x5a3618);

  // Chairs around table
  drawChair(g, x + 20, y + 80, 0x555566);
  drawChair(g, x + 20, y + 120, 0x555566);
  drawChair(g, x + ww - 34, y + 80, 0x555566);
  drawChair(g, x + ww - 34, y + 120, 0x555566);

  // Whiteboard on wall
  g.rect(x + 60, y + 14, 100, 40).fill(0xffffff);
  g.rect(x + 60, y + 14, 100, 40).stroke({ color: 0xaaaaaa, width: 2 });
  // Charts on whiteboard
  // Bar chart
  const bars = [20, 30, 15, 25, 35];
  for (let i = 0; i < bars.length; i++) {
    g.rect(x + 70 + i * 10, y + 50 - bars[i], 6, bars[i]).fill(i % 2 === 0 ? 0x4488ff : 0xff8844);
  }
  // Line
  g.moveTo(x + 125, y + 30).lineTo(x + 135, y + 25).lineTo(x + 145, y + 35).lineTo(x + 155, y + 20)
    .stroke({ color: 0xff4444, width: 1.5 });
}

function drawLab(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, w: number, _h: number) {
  const ww = w * CELL_SIZE;
  // Desk
  drawDesk(g, x + 20, y + 90, ww - 40, 8);
  // Dual monitors
  drawMonitor(g, x + 30, y + 54, 0x0a0a2e);
  drawMonitor(g, x + 80, y + 54, 0x0a0a2e);

  // Social feed on left monitor
  for (let i = 0; i < 3; i++) {
    g.circle(x + 35, y + 60 + i * 4, 1.5).fill(0x4488ff);
    g.rect(x + 39, y + 59 + i * 4, 10, 2).fill(0x4488ff);
  }
  // Trending graph on right monitor
  g.moveTo(x + 84, y + 64).lineTo(x + 90, y + 60).lineTo(x + 94, y + 62).lineTo(x + 100, y + 56)
    .stroke({ color: 0x44ff88, width: 1 });
  // Arrow up
  g.moveTo(x + 100, y + 56).lineTo(x + 98, y + 58).stroke({ color: 0x44ff88, width: 1 });
  g.moveTo(x + 100, y + 56).lineTo(x + 102, y + 58).stroke({ color: 0x44ff88, width: 1 });

  // Phone icon
  g.roundRect(x + 140, y + 80, 14, 22, 2).fill(0x333333);
  g.rect(x + 142, y + 84, 10, 14).fill(0x2244aa);
  g.circle(x + 147, y + 100, 2).fill(0x555555);
}

function drawField(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, w: number, _h: number) {
  const ww = w * CELL_SIZE;
  // Map on wall
  g.rect(x + 20, y + 16, 80, 50).fill(0xeeddbb);
  g.rect(x + 20, y + 16, 80, 50).stroke({ color: 0x8B6914, width: 1 });
  // Terrain features on map
  g.circle(x + 45, y + 35, 8).fill({ color: 0x44aa44, alpha: 0.4 });
  g.circle(x + 70, y + 50, 6).fill({ color: 0x44aa44, alpha: 0.3 });
  g.moveTo(x + 55, y + 25).lineTo(x + 65, y + 20).lineTo(x + 75, y + 30).stroke({ color: 0x8866444, width: 1 });
  // Pin on map
  g.circle(x + 60, y + 40, 3).fill(0xff3333);

  // Desk
  drawDesk(g, x + 30, y + 100, 80, 8);

  // Compass on desk
  const cx = x + 50, cy = y + 90;
  g.circle(cx, cy, 10).fill(0xddccaa);
  g.circle(cx, cy, 10).stroke({ color: 0x8B6914, width: 1 });
  g.moveTo(cx, cy - 7).lineTo(cx + 2, cy).lineTo(cx, cy + 7).lineTo(cx - 2, cy).closePath().fill(0xff3333);
  g.moveTo(cx, cy - 7).lineTo(cx - 2, cy).lineTo(cx, cy + 7).lineTo(cx + 2, cy).closePath().fill(0xffffff);

  // Binoculars on desk
  g.rect(x + 140, y + 95, 10, 14).fill(0x333333);
  g.rect(x + 155, y + 95, 10, 14).fill(0x333333);
  g.rect(x + 150, y + 99, 5, 6).fill(0x555555);
  g.circle(x + 145, y + 95, 5).stroke({ color: 0x444444, width: 2 });
  g.circle(x + 160, y + 95, 5).stroke({ color: 0x444444, width: 2 });
}

function drawCoffee(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, w: number, h: number) {
  const ww = w * CELL_SIZE;
  const hh = h * CELL_SIZE;

  // Counter
  g.rect(x + 10, y + 20, ww - 20, 14).fill(0x8B6914);
  g.rect(x + 10, y + 20, ww - 20, 3).fill(0xa07820);

  // Coffee machine
  g.rect(x + 20, y + 24, 24, 30).fill(0x444444);
  g.rect(x + 22, y + 26, 20, 8).fill(0x555555);
  g.rect(x + 26, y + 36, 12, 10).fill(0x222222);
  // Drip
  g.rect(x + 31, y + 40, 2, 4).fill(0x6b3a00);
  // Buttons
  g.circle(x + 38, y + 28, 2).fill(0x44ff44);
  g.circle(x + 38, y + 33, 2).fill(0xff4444);

  // Mugs
  g.rect(x + 55, y + 28, 8, 10).fill(0xffffff);
  g.rect(x + 63, y + 31, 3, 4).fill(0xffffff);
  g.rect(x + 55, y + 28, 8, 3).fill(0x6b3a00);

  g.rect(x + 75, y + 28, 8, 10).fill(0xff6666);
  g.rect(x + 83, y + 31, 3, 4).fill(0xff6666);
  g.rect(x + 75, y + 28, 8, 3).fill(0x6b3a00);

  // Small table
  g.rect(x + 60, y + 100, 40, 6).fill(0x8B6914);
  g.rect(x + 68, y + 106, 4, 20).fill(0x6b4226);
  g.rect(x + 88, y + 106, 4, 20).fill(0x6b4226);

  // Donuts on counter
  g.circle(x + 110, y + 32, 5).fill(0xffaa88);
  g.circle(x + 110, y + 32, 2).fill(0x8B6914);
  g.circle(x + 122, y + 33, 5).fill(0xff88cc);
  g.circle(x + 122, y + 33, 2).fill(0x8B6914);
  // Sprinkles
  g.rect(x + 108, y + 30, 2, 1).fill(0xff4444);
  g.rect(x + 112, y + 31, 2, 1).fill(0x44ff44);
  g.rect(x + 120, y + 31, 2, 1).fill(0xffff44);
}

function drawServer(g: InstanceType<PixiMod['Graphics']>, x: number, y: number, w: number, h: number) {
  const ww = w * CELL_SIZE;
  const hh = h * CELL_SIZE;

  // Server racks
  for (let i = 0; i < 3; i++) {
    const rx = x + 15 + i * 65;
    const ry = y + 20;
    // Rack frame
    g.rect(rx, ry, 50, hh - 40).fill(0x2a2a3a);
    g.rect(rx + 2, ry + 2, 46, hh - 44).fill(0x333344);
    // Server units
    for (let j = 0; j < 6; j++) {
      const uy = ry + 5 + j * 24;
      g.rect(rx + 4, uy, 42, 20).fill(0x1a1a2a);
      g.rect(rx + 4, uy, 42, 2).fill(0x444466);
      // Drive slots
      for (let k = 0; k < 4; k++) {
        g.rect(rx + 8 + k * 10, uy + 5, 8, 10).fill(0x222233);
      }
      // Vent holes
      g.rect(rx + 35, uy + 6, 8, 1).fill(0x1a1a2a);
      g.rect(rx + 35, uy + 9, 8, 1).fill(0x1a1a2a);
      g.rect(rx + 35, uy + 12, 8, 1).fill(0x1a1a2a);
    }
  }

  // Cables (floor)
  g.moveTo(x + 40, y + hh - 15).lineTo(x + 80, y + hh - 10).lineTo(x + 120, y + hh - 18)
    .stroke({ color: 0x444488, width: 2 });
  g.moveTo(x + 60, y + hh - 12).lineTo(x + 100, y + hh - 8).lineTo(x + 140, y + hh - 14)
    .stroke({ color: 0x884444, width: 2 });
}

/* ── Animated elements ── */
function drawAnimatedElements(
  app: InstanceType<PixiMod['Application']>,
  layer: InstanceType<PixiMod['Container']>,
  room: RoomDef,
  x: number, y: number, w: number, h: number,
  PIXI: PixiMod
) {
  if (room.name === 'server') {
    // Blinking LEDs on each rack
    for (let rack = 0; rack < 3; rack++) {
      for (let i = 0; i < 6; i++) {
        const led = new PIXI.Graphics();
        led.circle(0, 0, 1.5).fill(i % 2 === 0 ? 0x44ff44 : 0xff8844);
        led.x = x + 20 + rack * 65 + 6;
        led.y = y + 28 + i * 24 + 14;
        layer.addChild(led);
        const offset = rack * 2 + i * 1.3;
        app.ticker.add(() => {
          led.alpha = 0.3 + Math.sin(Date.now() * 0.005 + offset) * 0.5;
        });
        // Second LED
        const led2 = new PIXI.Graphics();
        led2.circle(0, 0, 1.5).fill(0xff4444);
        led2.x = led.x + 30;
        led2.y = led.y;
        layer.addChild(led2);
        app.ticker.add(() => {
          led2.alpha = Math.random() > 0.95 ? 1 : 0.15;
        });
      }
    }

    // Cooling fan animation
    const fan = new PIXI.Graphics();
    fan.x = x + w - 30;
    fan.y = y + h / 2 + 30;
    layer.addChild(fan);
    let fanAngle = 0;
    app.ticker.add(() => {
      fanAngle += 0.15;
      fan.clear();
      fan.circle(0, 0, 12).fill(0x333344);
      for (let b = 0; b < 4; b++) {
        const a = fanAngle + (b * Math.PI) / 2;
        fan.moveTo(0, 0).lineTo(Math.cos(a) * 10, Math.sin(a) * 10).stroke({ color: 0x667788, width: 2 });
      }
      fan.circle(0, 0, 3).fill(0x556677);
    });
  }

  if (room.name === 'coffee') {
    // Coffee steam
    const steamParts: { g: InstanceType<PixiMod['Graphics']>; seed: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const steam = new PIXI.Graphics();
      steam.circle(0, 0, 2).fill(0xffffff);
      steam.x = x + 32 + i * 3;
      steam.y = y + 22;
      steam.alpha = 0;
      layer.addChild(steam);
      steamParts.push({ g: steam, seed: i * 40 });
    }
    app.ticker.add(() => {
      const t = Date.now() * 0.003;
      for (const s of steamParts) {
        const phase = (t + s.seed * 0.1) % 3;
        s.g.y = y + 22 - phase * 8;
        s.g.x = x + 32 + Math.sin(t * 2 + s.seed) * 3;
        s.g.alpha = Math.max(0, 0.4 - phase * 0.15);
      }
    });
  }

  // Monitor screen flicker for rooms with monitors
  if (['workshop', 'watchtower', 'lab'].includes(room.name)) {
    const flicker = new PIXI.Graphics();
    flicker.rect(0, 0, 20, 12).fill({ color: 0xffffff, alpha: 0.03 });
    flicker.visible = false;
    if (room.name === 'workshop') {
      flicker.x = x + 35;
      flicker.y = y + 48;
    } else if (room.name === 'watchtower') {
      flicker.x = x + 92;
      flicker.y = y + 36;
    } else {
      flicker.x = x + 52;
      flicker.y = y + 72;
    }
    layer.addChild(flicker);
    app.ticker.add(() => {
      flicker.visible = Math.random() > 0.97;
    });
  }
}

/* ── Potted plant helper ── */
function drawPottedPlant(
  layer: InstanceType<PixiMod['Container']>,
  PIXI: PixiMod,
  px: number, py: number
) {
  const g = new PIXI.Graphics();
  // Pot
  g.moveTo(px - 8, py).lineTo(px - 6, py + 14).lineTo(px + 6, py + 14).lineTo(px + 8, py).closePath().fill(0xcc6633);
  g.rect(px - 9, py - 1, 18, 3).fill(0xdd7744);
  // Dirt
  g.ellipse(px, py + 1, 6, 2).fill(0x553322);
  // Leaves
  g.circle(px, py - 6, 5).fill(0x44aa44);
  g.circle(px - 5, py - 3, 4).fill(0x338833);
  g.circle(px + 5, py - 3, 4).fill(0x55bb55);
  g.circle(px - 2, py - 10, 3).fill(0x44aa44);
  g.circle(px + 3, py - 9, 3).fill(0x55bb55);
  // Stem
  g.rect(px - 1, py - 5, 2, 6).fill(0x337722);
  // Shadow
  g.ellipse(px, py + 15, 10, 2).fill({ color: 0x000000, alpha: 0.1 });
  layer.addChild(g);
}
