import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { AgentStatus } from '@agent-office/shared';
import { AGENT_COLORS, CELL_SIZE } from '@/lib/constants';

const STATUS_COLORS: Record<string, number> = {
  idle: 0x44ff44,
  working: 0xffcc00,
  thinking: 0x44aaff,
};

const AGENT_ACCESSORIES: Record<string, string> = {
  minion: 'hardhat',
  sage: 'glasses',
  scout: 'binoculars',
  quill: 'beret',
  xalt: 'sunglasses',
  observer: 'magnifier',
};

export class AgentSprite {
  container: Container;
  private bodyGroup: Container;
  private body: Graphics;
  private head: Graphics;
  private face: Graphics;
  private antenna: Graphics;
  private accessory: Graphics;
  private legs: Graphics;
  private nameLabel: Text;
  private statusDot: Graphics;
  private bubble: Container;
  private particles: Container;
  private _status: AgentStatus = 'idle';
  private _mood = 'neutral';
  private _targetX = 0;
  private _targetY = 0;
  private bobTime = Math.random() * Math.PI * 2;
  private blinkTimer = Math.random() * 200;
  private isBlinking = false;
  private agentId: string;
  private color: number;

  constructor(agentId: string, name: string) {
    this.agentId = agentId;
    this.color = AGENT_COLORS[agentId] || 0xaaaaaa;

    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';

    this.bodyGroup = new Container();
    this.container.addChild(this.bodyGroup);

    // Shadow
    const shadow = new Graphics();
    shadow.ellipse(0, 18, 10, 3).fill({ color: 0x000000, alpha: 0.2 });
    this.container.addChildAt(shadow, 0);

    // Legs
    this.legs = new Graphics();
    this.drawLegs();
    this.bodyGroup.addChild(this.legs);

    // Body
    this.body = new Graphics();
    this.drawBody();
    this.bodyGroup.addChild(this.body);

    // Head
    this.head = new Graphics();
    this.drawHead();
    this.bodyGroup.addChild(this.head);

    // Antenna
    this.antenna = new Graphics();
    this.drawAntenna();
    this.bodyGroup.addChild(this.antenna);

    // Face (eyes on screen)
    this.face = new Graphics();
    this.drawFace(false);
    this.bodyGroup.addChild(this.face);

    // Accessory
    this.accessory = new Graphics();
    this.drawAccessory();
    this.bodyGroup.addChild(this.accessory);

    // Status dot
    this.statusDot = new Graphics();
    this.statusDot.circle(14, -18, 3).fill(0x44ff44);
    this.statusDot.circle(14, -18, 2).fill(0x88ff88);
    this.bodyGroup.addChild(this.statusDot);

    // Name label
    this.nameLabel = new Text({
      text: name,
      style: new TextStyle({
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 6,
        fill: 0xffffff,
        align: 'center',
        dropShadow: {
          color: 0x000000,
          distance: 1,
          alpha: 0.5,
        },
      }),
    });
    this.nameLabel.anchor.set(0.5, 0);
    this.nameLabel.y = 22;
    this.container.addChild(this.nameLabel);

    // Thought bubble
    this.bubble = new Container();
    this.bubble.visible = false;
    const bubbleBg = new Graphics();
    bubbleBg.roundRect(-14, -38, 28, 16, 4).fill(0xffffff);
    bubbleBg.roundRect(-14, -38, 28, 16, 4).stroke({ color: 0xcccccc, width: 1 });
    bubbleBg.circle(-4, -22, 2).fill(0xffffff);
    bubbleBg.circle(-2, -18, 1.5).fill(0xffffff);
    this.bubble.addChild(bubbleBg);
    const qMark = new Text({
      text: '?',
      style: new TextStyle({ fontFamily: '"Press Start 2P", monospace', fontSize: 8, fill: 0x333333 }),
    });
    qMark.anchor.set(0.5, 0.5);
    qMark.position.set(0, -30);
    this.bubble.addChild(qMark);
    this.bodyGroup.addChild(this.bubble);

    // Particles
    this.particles = new Container();
    this.container.addChild(this.particles);
  }

  private drawLegs() {
    this.legs.clear();
    // Left leg
    this.legs.rect(-6, 10, 4, 6).fill(this.darken(this.color, 0.6));
    this.legs.rect(-7, 15, 5, 2).fill(this.darken(this.color, 0.5));
    // Right leg
    this.legs.rect(2, 10, 4, 6).fill(this.darken(this.color, 0.6));
    this.legs.rect(2, 15, 5, 2).fill(this.darken(this.color, 0.5));
  }

  private drawBody() {
    this.body.clear();
    // Main body rectangle
    this.body.rect(-8, 2, 16, 10).fill(this.color);
    // Highlight
    this.body.rect(-6, 3, 3, 8).fill({ color: 0xffffff, alpha: 0.15 });
    // Bottom edge shadow
    this.body.rect(-8, 10, 16, 2).fill(this.darken(this.color, 0.7));
  }

  private drawHead() {
    this.head.clear();
    // Square-ish robot head
    this.head.roundRect(-10, -16, 20, 16, 2).fill(this.color);
    // Screen/face area (darker inset)
    this.head.roundRect(-8, -14, 16, 11, 1).fill(this.darken(this.color, 0.3));
    // Screen glow
    this.head.roundRect(-7, -13, 14, 9, 1).fill(0x112233);
    // Highlight on head
    this.head.rect(-9, -15, 2, 4).fill({ color: 0xffffff, alpha: 0.2 });
  }

  private drawAntenna() {
    this.antenna.clear();
    this.antenna.rect(-1, -20, 2, 5).fill(this.darken(this.color, 0.7));
    this.antenna.circle(0, -21, 2.5).fill(0xff4444);
    this.antenna.circle(-0.5, -22, 1).fill({ color: 0xffffff, alpha: 0.4 });
  }

  private drawFace(blinking: boolean) {
    this.face.clear();
    if (blinking) {
      // Closed eyes — horizontal lines
      this.face.rect(-5, -9, 4, 1).fill(0x44ffaa);
      this.face.rect(1, -9, 4, 1).fill(0x44ffaa);
    } else {
      // Left eye - pixel style
      this.face.rect(-5, -11, 4, 4).fill(0x44ffaa);
      this.face.rect(-4, -10, 2, 2).fill(0xffffff);
      // Right eye
      this.face.rect(1, -11, 4, 4).fill(0x44ffaa);
      this.face.rect(2, -10, 2, 2).fill(0xffffff);
    }
    // Small mouth
    this.face.rect(-3, -6, 6, 1).fill(0x44ffaa);
  }

  private drawAccessory() {
    this.accessory.clear();
    const type = AGENT_ACCESSORIES[this.agentId];
    switch (type) {
      case 'hardhat':
        // Orange hard hat on top of head
        this.accessory.roundRect(-11, -19, 22, 5, 2).fill(0xff6600);
        this.accessory.rect(-8, -21, 16, 4).fill(0xff8800);
        this.accessory.rect(-6, -22, 12, 2).fill(0xffaa33);
        // Highlight
        this.accessory.rect(-5, -22, 4, 1).fill({ color: 0xffffff, alpha: 0.3 });
        break;
      case 'glasses':
        // Round glasses over eyes
        this.accessory.circle(-3, -9, 4).stroke({ color: 0xddddff, width: 1.5 });
        this.accessory.circle(3, -9, 4).stroke({ color: 0xddddff, width: 1.5 });
        this.accessory.rect(-1, -10, 2, 1).fill(0xddddff);
        this.accessory.rect(-8, -10, 2, 1).fill(0xddddff);
        this.accessory.rect(6, -10, 2, 1).fill(0xddddff);
        break;
      case 'binoculars':
        // Binoculars hanging from neck
        this.accessory.rect(-5, 2, 3, 5).fill(0x444444);
        this.accessory.rect(2, 2, 3, 5).fill(0x444444);
        this.accessory.circle(-3.5, 2, 2).fill(0x333333);
        this.accessory.circle(3.5, 2, 2).fill(0x333333);
        // Strap
        this.accessory.moveTo(-4, 0).lineTo(-6, -4).stroke({ color: 0x666666, width: 1 });
        this.accessory.moveTo(4, 0).lineTo(6, -4).stroke({ color: 0x666666, width: 1 });
        break;
      case 'beret':
        // Purple beret
        this.accessory.ellipse(0, -17, 11, 4).fill(0x7733aa);
        this.accessory.ellipse(2, -18, 8, 3).fill(0x8844bb);
        this.accessory.circle(6, -19, 2).fill(0x9955cc);
        break;
      case 'sunglasses':
        // Cool shades
        this.accessory.rect(-7, -11, 6, 4).fill(0x111111);
        this.accessory.rect(1, -11, 6, 4).fill(0x111111);
        this.accessory.rect(-1, -10, 2, 1).fill(0x222222);
        // Lens glare
        this.accessory.rect(-6, -11, 2, 1).fill({ color: 0xffffff, alpha: 0.3 });
        this.accessory.rect(2, -11, 2, 1).fill({ color: 0xffffff, alpha: 0.3 });
        break;
      case 'magnifier':
        // Magnifying glass held to the side
        this.accessory.circle(14, -4, 5).stroke({ color: 0xddaa44, width: 2 });
        this.accessory.circle(14, -4, 3).fill({ color: 0xaaddff, alpha: 0.3 });
        this.accessory.rect(10, 0, 2, 8).fill(0x8B6914);
        break;
    }
  }

  private darken(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  setPosition(gridX: number, gridY: number) {
    this._targetX = gridX * CELL_SIZE + CELL_SIZE / 2;
    this._targetY = gridY * CELL_SIZE + CELL_SIZE / 2;
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
    const c = STATUS_COLORS[status] || 0x44ff44;
    this.statusDot.circle(14, -18, 3).fill(c);
    this.statusDot.circle(14, -18, 1.5).fill({ color: 0xffffff, alpha: 0.4 });
    this.bubble.visible = status === 'thinking';
  }

  setMood(mood: string) {
    this._mood = mood;
  }

  update(dt: number) {
    this.bobTime += dt * 0.05;

    // Lerp
    this.container.x += (this._targetX - this.container.x) * 0.05;
    this.container.y += (this._targetY - this.container.y) * 0.05;

    // Bob
    const bobAmp = this._status === 'working' ? 2.5 : 1.2;
    const bobSpd = this._status === 'working' ? 2 : 1;
    const bobY = Math.sin(this.bobTime * bobSpd) * bobAmp;
    this.bodyGroup.y = bobY;

    // Leg animation when working
    if (this._status === 'working') {
      this.legs.y = Math.abs(Math.sin(this.bobTime * 3)) * 1;
    } else {
      this.legs.y = 0;
    }

    // Blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.drawFace(false);
        this.blinkTimer = 100 + Math.random() * 200;
      } else {
        this.isBlinking = true;
        this.drawFace(true);
        this.blinkTimer = 5 + Math.random() * 3;
      }
    }

    // Antenna glow pulse
    const antennaPulse = 0.5 + Math.sin(this.bobTime * 3) * 0.5;
    this.antenna.alpha = 0.7 + antennaPulse * 0.3;

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
    const color = this.color;
    p.star(0, 0, 4, 3, 1.5).fill(color);
    p.x = (Math.random() - 0.5) * 20;
    p.y = -20 + (Math.random() - 0.5) * 10;
    p.alpha = 1;
    this.particles.addChild(p);
  }
}
