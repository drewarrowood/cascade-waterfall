import { lerp } from "./noise";
import { rgba } from "./palette";
import type { Params, World } from "./types";

interface Bird {
  x: number;
  y: number;
  vx: number;
  phase: number;
  scale: number;
}

interface Firefly {
  x: number;
  y: number;
  phase: number;
  speed: number;
}

export class Fauna {
  birds: Bird[] = [];
  flies: Firefly[] = [];
  seeded = false;

  ensure(world: World, params: Params) {
    if (this.seeded) return;
    this.seeded = true;
    for (let i = 0; i < 6; i++) {
      this.birds.push({
        x: Math.random() * world.w,
        y: world.h * (0.12 + Math.random() * 0.28),
        vx: lerp(22, 48, Math.random()) * (Math.random() > 0.5 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        scale: lerp(0.7, 1.2, Math.random()),
      });
    }
    for (let i = 0; i < 28; i++) {
      this.flies.push({
        x: world.cx + (Math.random() - 0.5) * world.w * 0.4,
        y: lerp(world.poolY - 80, world.h * 0.92, Math.random()),
        phase: Math.random() * Math.PI * 2,
        speed: lerp(0.6, 1.6, Math.random()),
      });
    }
  }

  reseed() {
    this.seeded = false;
    this.birds = [];
    this.flies = [];
  }

  step(dt: number, world: World, params: Params) {
    this.ensure(world, params);
    if (!params.wildlife) return;
    for (const b of this.birds) {
      b.x += b.vx * dt;
      b.y += Math.sin(b.phase) * 8 * dt;
      b.phase += dt * 9;
      if (b.x > world.w + 40) b.x = -40;
      if (b.x < -40) b.x = world.w + 40;
    }
    for (const f of this.flies) {
      f.phase += dt * f.speed;
      f.x += Math.sin(f.phase * 1.7) * 12 * dt;
      f.y += Math.cos(f.phase * 1.3) * 8 * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, world: World, params: Params) {
    if (!params.wildlife) return;
    const day = params.timeOfDay > 6.4 && params.timeOfDay < 18.8;
    if (day && params.weather < 0.7) {
      ctx.strokeStyle = rgba([28, 30, 32], 0.55);
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      for (const b of this.birds) {
        const flap = Math.sin(b.phase) * 0.55;
        ctx.beginPath();
        ctx.moveTo(b.x - 7 * b.scale, b.y + flap * 4);
        ctx.quadraticCurveTo(b.x, b.y, b.x + 7 * b.scale, b.y + flap * 4);
        ctx.stroke();
      }
    }
    const night = params.timeOfDay < 5.8 || params.timeOfDay > 19.5;
    if (night) {
      for (const f of this.flies) {
        const blink = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(f.phase * 3));
        ctx.fillStyle = rgba([214, 230, 120], 0.12 * blink);
        ctx.beginPath();
        ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([236, 250, 150], 0.7 * blink);
        ctx.beginPath();
        ctx.arc(f.x, f.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
