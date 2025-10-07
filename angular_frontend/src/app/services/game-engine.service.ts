import { Injectable, NgZone } from '@angular/core';

export type LevelConfig = {
  speed: number;
  spawnMs: [number, number];
  gravity: number;
  jumpVel: number;
};

type Obstacle = { x: number; y: number; w: number; h: number; color: string };

/**
 * Minimal 2D runner engine using canvas and requestAnimationFrame.
 * Handles player physics, obstacle spawning, collision, score and lives.
 * All browser APIs are guarded to support SSR/prerender.
 */
@Injectable({ providedIn: 'root' })
export class GameEngineService {
  private ctx: any | undefined;
  private raf = 0;
  private last = 0;
  private running = false;

  private w = 800;
  private h = 400;
  private player = { x: 80, y: 0, w: 32, h: 32, vy: 0, onGround: false, color: '#2563EB' };
  private ground = 340;

  private obstacles: Obstacle[] = [];

  private score = 0;
  private lives = 3;
  private level = 1;

  private levelCfgs: Record<number, LevelConfig> = {
    1: { speed: 3, spawnMs: [1200, 2000], gravity: 0.6, jumpVel: -11 },
    2: { speed: 4, spawnMs: [900, 1500], gravity: 0.7, jumpVel: -12.5 },
    3: { speed: 5.2, spawnMs: [700, 1200], gravity: 0.75, jumpVel: -13 },
  };

  private spawnTimer = 0;
  private nextSpawnDelay = 1200;

  private keyset = new Set<string>();

  constructor(private zone: NgZone) {}

  // PUBLIC_INTERFACE
  attachCanvas(canvas: any) {
    /** Bind the rendering context to the provided canvas and setup engine */
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;

    // Only attach context in browser
    try {
      if (g && g.HTMLCanvasElement && canvas instanceof g.HTMLCanvasElement && typeof (canvas as any).getContext === 'function') {
        this.ctx = canvas.getContext('2d') as any;
      } else if (typeof (canvas as any).getContext === 'function') {
        // Fallback for environments without proper instanceof check
        this.ctx = (canvas as any).getContext('2d') as any;
      } else {
        this.ctx = undefined;
      }
    } catch {
      this.ctx = undefined;
    }

    this.resize(canvas);
    this.bindInputs(canvas);
    this.reset();
  }

  private bindInputs(canvas: any) {
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;

    // Keyboard
    if (g && g.window) {
      g.window.addEventListener('keydown', (e: any) => {
        this.keyset.add(e.key);
        if (e.key === ' ' || e.key === 'ArrowUp') {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
        }
      });
      g.window.addEventListener('keyup', (e: any) => {
        this.keyset.delete(e.key);
      });
    }

    // Focus canvas for key input on click/tap
    if (canvas && typeof (canvas as any).addEventListener === 'function') {
      (canvas as any).addEventListener('click', () => {
        if (typeof (canvas as any).focus === 'function') (canvas as any).focus();
      });
    }

    // Listen to external level changes
    if (g && g.document) {
      g.document.addEventListener('game:setLevel', (e: any) => {
        const ce = e as { detail?: number };
        if (typeof ce?.detail !== 'undefined') this.setLevel(Number(ce.detail));
      });
    }
  }

  private resize(canvas: any) {
    this.w = (canvas && (canvas as any).clientWidth) || 800;
    this.h = 400;
    try {
      (canvas as any).width = this.w;
      (canvas as any).height = this.h;
    } catch {
      // ignore on SSR
    }
    this.ground = Math.floor(this.h * 0.85);
  }

  // PUBLIC_INTERFACE
  setLevel(l: number) {
    /** Set current level within bounds 1..3 */
    this.level = Math.max(1, Math.min(3, Number(l) || 1));
  }

  // PUBLIC_INTERFACE
  start(loopCb: (s: number, l: number) => void, _livesCb: (l: number) => void) {
    /** Start the game loop with outside Angular change detection */
    if (this.running) return;
    this.running = true;

    this.zone.runOutsideAngular(() => {
      const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
      const now = g && g.performance && typeof g.performance.now === 'function' ? g.performance.now() : Date.now();
      this.last = now;

      const step = (t: number) => {
        const dt = t - this.last;
        this.last = t;
        this.update(dt);
        loopCb(this.score, this.lives);
        if (this.running && g && typeof g.requestAnimationFrame === 'function') {
          this.raf = g.requestAnimationFrame(step);
        }
      };

      if (g && typeof g.requestAnimationFrame === 'function') {
        this.raf = g.requestAnimationFrame(step);
      } else {
        // Fallback: simple interval for environments without rAF (rare in browser)
        const fallbackStep = () => {
          if (!this.running) return;
          const t2 = Date.now();
          const dt = t2 - this.last;
          this.last = t2;
          this.update(dt);
          loopCb(this.score, this.lives);
          const g2: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
          if (g2 && typeof g2.setTimeout === 'function') {
            g2.setTimeout(fallbackStep, 16);
          }
        };
        fallbackStep();
      }
    });
  }

  // PUBLIC_INTERFACE
  stop() {
    /** Stop the game loop */
    this.running = false;
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && typeof g.cancelAnimationFrame === 'function') {
      g.cancelAnimationFrame(this.raf);
    }
  }

  // PUBLIC_INTERFACE
  reset() {
    /** Reset player, score, lives and obstacles */
    this.player.y = this.ground - this.player.h;
    this.player.vy = 0;
    this.player.onGround = true;
    this.obstacles = [];
    this.score = 0;
    this.lives = 3;
    this.spawnTimer = 0;
    const cfg = this.levelCfgs[this.level] || this.levelCfgs[1];
    this.nextSpawnDelay = this.rand(cfg.spawnMs[0], cfg.spawnMs[1]);
  }

  private update(dt: number) {
    const cfg = this.levelCfgs[this.level] || this.levelCfgs[1];

    // Spawn obstacle
    this.spawnTimer += dt;
    if (this.spawnTimer > this.nextSpawnDelay) {
      this.spawnTimer = 0;
      this.nextSpawnDelay = this.rand(cfg.spawnMs[0], cfg.spawnMs[1]);
      this.obstacles.push({
        x: this.w + 20,
        y: this.ground - 24,
        w: this.rand(18, 32),
        h: this.rand(18, 32),
        color: '#F59E0B',
      });
    }

    // Controls
    if (this.keyset.has(' ') || this.keyset.has('ArrowUp')) this.jump(cfg);

    // Physics
    this.player.vy += cfg.gravity;
    this.player.y += this.player.vy;
    if (this.player.y >= this.ground - this.player.h) {
      this.player.y = this.ground - this.player.h;
      this.player.vy = 0;
      this.player.onGround = true;
    }

    // Move obstacles
    this.obstacles.forEach((o) => (o.x -= cfg.speed));
    this.obstacles = this.obstacles.filter((o) => o.x > -50);

    // Collisions
    this.detectCollisions();

    // Score
    this.score += Math.floor(dt * 0.02 * cfg.speed);

    // Render
    this.draw();
  }

  private jump(cfg: LevelConfig) {
    if (this.player.onGround) {
      this.player.vy = cfg.jumpVel;
      this.player.onGround = false;
    }
  }

  private detectCollisions() {
    for (const o of this.obstacles) {
      if (this.aabb(this.player.x, this.player.y, this.player.w, this.player.h, o.x, o.y, o.w, o.h)) {
        this.handleHit();
        break;
      }
    }
  }

  private handleHit() {
    this.lives--;
    this.player.y = this.ground - this.player.h;
    this.player.vy = 0;
    this.player.onGround = true;
    this.obstacles = [];
    if (this.lives <= 0) {
      this.stop();
      const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
      if (g && g.document && typeof g.CustomEvent !== 'undefined') {
        g.document.dispatchEvent(new g.CustomEvent('game:over', { detail: { score: this.score } }));
      }
    }
  }

  /**
   * Axis-Aligned Bounding Box collision detection.
   * Returns true if rectangles A and B overlap.
   */
  private aabb(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private draw() {
    if (!this.ctx) return;
    const c = this.ctx;

    // Clear and background gradient
    c.clearRect(0, 0, this.w, this.h);
    const gGrad = c.createLinearGradient(0, 0, 0, this.h);
    gGrad.addColorStop(0, 'rgba(37,99,235,0.08)');
    gGrad.addColorStop(1, '#fff');
    c.fillStyle = gGrad;
    c.fillRect(0, 0, this.w, this.h);

    // Ground
    c.fillStyle = '#e5e7eb';
    c.fillRect(0, this.ground + 2, this.w, this.h - (this.ground + 2));

    // Player
    c.fillStyle = this.player.color;
    c.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);

    // Obstacles
    for (const o of this.obstacles) {
      c.fillStyle = o.color;
      c.fillRect(o.x, o.y, o.w, o.h);
    }

    // HUD
    c.fillStyle = '#111827';
    c.font = '600 16px Inter, system-ui, sans-serif';
    c.fillText(`Score: ${this.score}`, 16, 24);
    c.fillText(`Lives: ${this.lives}`, 16, 46);
    c.fillText(`Level: ${this.level}`, 16, 68);
  }

  private rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
