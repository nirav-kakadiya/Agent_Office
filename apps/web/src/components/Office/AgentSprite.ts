import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { AgentStatus } from '@agent-office/shared';
import { AGENT_COLORS, CELL_SIZE } from '@/lib/constants';

const STATUS_COLORS: Record<string, number> = {
  idle: 0x44ff44,
  working: 0xffcc00,
  thinking: 0x44aaff,
};

export class AgentSprite {
  container: Container;
  private body: Graphics;
  private eyes: Graphics;
  private nameLabel: Text;
  private statusDot: Graphics;
  private bubble: Container;
  private particles: Container;
  private _status: AgentStatus = 'idle';
  private _mood = 'neutral';
  private _targetX = 0;
  private _targetY = 0;
  private bobTime = Math.random() * Math.PI * 2;
  private agentId: string;

  constructor(agentId: string, name: string) {
    this.agentId = agentId;
    const color = AGENT_COLORS[agentId] || 0xaaaaaa;

    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';

    // Body — 16x16 circle-ish character scaled to cell
    this.body = new Graphics();
    this.drawBody(color);
    this.container.addChild(this.body);

    // Eyes
    this.eyes = new Graphics();
    this.drawEyes();
    this.container.addChild(this.eyes);

    // Status dot
    this.statusDot = new Graphics();
    this.statusDot.circle(12, -10, 4).fill(0x44ff44);
    this.container.addChild(this.statusDot);

    // Name label
    this.nameLabel = new Text({
      text: name,
      style: new TextStyle({
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 7,
        fill: 0xffffff,
        align: 'center',
      }),
    });
    this.nameLabel.anchor.set(0.5, 0);
    this.nameLabel.y = 16;
    this.container.addChild(this.nameLabel);

    // Thought bubble (hidden by default)
    this.bubble = new Container();
    this.bubble.visible = false;
    const bubbleBg = new Graphics();
    bubbleBg.roundRect(-12, -30, 24, 16, 4).fill(0xffffff);
    bubbleBg.circle(-4, -16, 2).fill(0xffffff);
    bubbleBg.circle(-2, -12, 1.5).fill(0xffffff);
    this.bubble.addChild(bubbleBg);
    const qMark = new Text({
      text: '?',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0x333333 }),
    });
    qMark.anchor.set(0.5, 0.5);
    qMark.position.set(0, -22);
    this.bubble.addChild(qMark);
    this.container.addChild(this.bubble);

    // Particles container
    this.particles = new Container();
    this.container.addChild(this.particles);
  }

  private drawBody(color: number) {
    this.body.clear();
    // Head
    this.body.circle(0, -4, 10).fill(color);
    // Body
    this.body.roundRect(-7, 4, 14, 10, 2).fill(color);
  }

  private drawEyes() {
    this.eyes.clear();
    // Left eye
    this.eyes.circle(-3, -6, 2).fill(0xffffff);
    this.eyes.circle(-3, -6, 1).fill(0x111111);
    // Right eye
    this.eyes.circle(3, -6, 2).fill(0xffffff);
    this.eyes.circle(3, -6, 1).fill(0x111111);
  }

  setPosition(gridX: number, gridY: number) {
    this._targetX = gridX * CELL_SIZE + CELL_SIZE / 2;
    this._targetY = gridY * CELL_SIZE + CELL_SIZE / 2;
    // Snap if far
    const dx = this._targetX - this.container.x;
    const dy = this._targetY - this.container.y;
    if (Math.abs(dx) > CELL_SIZE * 6 || Math.abs(dy) > CELL_SIZE * 6 || this.container.x === 0) {
      this.container.x = this._targetX;
      this.container.y = this._targetY;
    }
  }

  setStatus(status: AgentStatus) {
    this._status = status;
    this.statusDot.clear();
    this.statusDot.circle(12, -10, 4).fill(STATUS_COLORS[status] || 0x44ff44);
    this.bubble.visible = status === 'thinking';
  }

  setMood(mood: string) {
    this._mood = mood;
    const color = AGENT_COLORS[this.agentId] || 0xaaaaaa;
    const warm = ['eager', 'curious', 'inspired'].includes(mood);
    const tint = warm ? 0xfff0d0 : 0xffffff;
    this.body.tint = tint;
    void color; // base color already drawn
  }

  update(dt: number) {
    this.bobTime += dt * 0.05;

    // Lerp to target position
    this.container.x += (this._targetX - this.container.x) * 0.05;
    this.container.y += (this._targetY - this.container.y) * 0.05;

    // Bob animation
    const bobAmplitude = this._status === 'working' ? 3 : 1.5;
    const bobSpeed = this._status === 'working' ? 2 : 1;
    this.body.y = Math.sin(this.bobTime * bobSpeed) * bobAmplitude;
    this.eyes.y = this.body.y;

    // Working particles
    if (this._status === 'working' && Math.random() < 0.05) {
      this.spawnParticle();
    }

    // Update particles
    for (let i = this.particles.children.length - 1; i >= 0; i--) {
      const p = this.particles.children[i];
      p.y -= 0.5;
      p.alpha -= 0.02;
      if (p.alpha <= 0) this.particles.removeChildAt(i);
    }
  }

  private spawnParticle() {
    const p = new Graphics();
    const color = AGENT_COLORS[this.agentId] || 0xffff00;
    p.star(0, 0, 4, 3, 1.5).fill(color);
    p.x = (Math.random() - 0.5) * 20;
    p.y = -15 + (Math.random() - 0.5) * 10;
    p.alpha = 1;
    this.particles.addChild(p);
  }
}
