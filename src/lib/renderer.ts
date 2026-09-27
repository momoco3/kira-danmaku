// 1コマを描くファイルです。プレビューと書き出しで共通です。
// 描く順番: 画面全体の星 → 絵の後ろのキラキラの尾 → 絵（光のにじみ＋絵）→ 絵に乗る「キラーン」
import type { Illustration, Settings } from '../types';
import { hash01, spritePose, type Scene } from './scene';

export type Assets = {
  images: { canvas: HTMLCanvasElement; glow: HTMLCanvasElement; aspect: number; glowPad: number }[];
  glints: HTMLCanvasElement[];
};

const GLINT_COLORS = ['#ffffff', '#fff3a0', '#ffc6ea', '#bff4ff', '#e2d4ff'];

/** 絵とキラキラを、描きやすい大きさの画像に先に変換しておく */
export function prepareAssets(illustrations: Illustration[], spriteHeight: number): Assets {
  const images = illustrations.map((ill) => {
    const aspect = ill.width / ill.height;
    const h = Math.max(8, Math.round(spriteHeight));
    const w = Math.max(8, Math.round(h * aspect));
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(ill.image, 0, 0, w, h);

    // 光のにじみ: 絵の形の影を白くぼかしたもの（Safari でも使える shadowBlur を使う）
    const glowPad = Math.round(h * 0.14);
    const glow = makeCanvas(w + glowPad * 2, h + glowPad * 2);
    const g = glow.getContext('2d')!;
    g.shadowColor = 'rgba(255, 250, 225, 0.95)';
    g.shadowBlur = glowPad * 0.9;
    g.shadowOffsetX = 10000;
    g.drawImage(canvas, glowPad - 10000, glowPad);
    g.drawImage(canvas, glowPad - 10000, glowPad);
    return { canvas, glow, aspect, glowPad };
  });
  return { images, glints: GLINT_COLORS.map(makeGlint) };
}

/** 4方向に光が伸びる「キラッ」の形 */
function makeGlint(color: string): HTMLCanvasElement {
  const size = 96;
  const c = makeCanvas(size, size);
  const g = c.getContext('2d')!;
  const mid = size / 2;
  const halo = g.createRadialGradient(mid, mid, 0, mid, mid, mid * 0.55);
  halo.addColorStop(0, color);
  halo.addColorStop(0.25, hexToRgba(color, 0.55));
  halo.addColorStop(1, hexToRgba(color, 0));
  g.fillStyle = halo;
  g.fillRect(0, 0, size, size);
  g.fillStyle = color;
  const ray = (len: number, width: number) => {
    g.beginPath();
    g.moveTo(mid, mid - len);
    g.quadraticCurveTo(mid + width, mid, mid, mid + len);
    g.quadraticCurveTo(mid - width, mid, mid, mid - len);
    g.fill();
  };
  ray(mid * 0.98, mid * 0.13);
  g.save();
  g.translate(mid, mid);
  g.rotate(Math.PI / 2);
  g.translate(-mid, -mid);
  ray(mid * 0.98, mid * 0.13);
  g.restore();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(mid, mid, mid * 0.09, 0, Math.PI * 2);
  g.fill();
  return c;
}

const TRAIL_LIFE = 0.6;
const GLITTER_SLOT = 0.3;
const GLITTER_LIFE = 0.8;

/**
 * @param clear false にすると画面を消さずに重ねて描く（生配信モードで弾幕を重ねるとき）
 */
export function renderFrame(ctx: CanvasRenderingContext2D, scene: Scene, t: number, assets: Assets, settings: Settings, clear = true) {
  const { width: W, height: H } = scene;
  const { sparkle, flow } = settings;
  const background = settings.output.background;

  ctx.save();
  if (clear) ctx.clearRect(0, 0, W, H);
  if (clear && background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);
  }
  const amount = sparkle.amount;
  const dir = flow.direction === 'rtl' ? 1 : -1;

  const drawGlint = (index: number, x: number, y: number, size: number, alpha: number, rotation = 0) => {
    if (alpha <= 0.01 || size < 1) return;
    ctx.globalAlpha = Math.min(1, alpha);
    const glint = assets.glints[index % assets.glints.length];
    if (rotation) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.drawImage(glint, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else ctx.drawImage(glint, x - size / 2, y - size / 2, size, size);
  };

  // ---- 画面全体でまたたく星（量の波に合わせて増える） ----
  if (sparkle.glitter && amount > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const firstSlot = Math.floor((t - GLITTER_LIFE) / GLITTER_SLOT);
    const lastSlot = Math.floor(t / GLITTER_SLOT);
    for (let slot = firstSlot; slot <= lastSlot; slot++) {
      const slotTime = slot * GLITTER_SLOT;
      const count = Math.round(amount * (4 + 46 * scene.envelope(slotTime)));
      for (let i = 0; i < count; i++) {
        const seed = slot * 131 + i * 7 + settings.output.seed * 1009;
        const born = slotTime + hash01(seed) * GLITTER_SLOT;
        const age = t - born;
        if (age < 0 || age > GLITTER_LIFE) continue;
        const a = Math.sin((Math.PI * age) / GLITTER_LIFE);
        const size = H * (0.025 + hash01(seed + 3) * 0.05) * (0.6 + 0.4 * a);
        drawGlint(Math.floor(hash01(seed + 5) * 5), hash01(seed + 1) * W, hash01(seed + 2) * H, size, a * 0.9, age * 1.5);
      }
    }
  }

  // ---- 表示中の絵を集める ----
  const visible: { sprite: (typeof scene.sprites)[number]; index: number }[] = [];
  scene.sprites.forEach((sprite, index) => {
    if (t >= sprite.spawn && t <= sprite.spawn + sprite.crossTime + TRAIL_LIFE) visible.push({ sprite, index });
  });

  // ---- 絵のうしろに残るキラキラの尾 ----
  if (amount > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const interval = 0.2 - 0.165 * amount;
    for (const { sprite, index } of visible) {
      const image = assets.images[sprite.imageIndex];
      if (!image) continue;
      const first = Math.max(0, Math.ceil((t - TRAIL_LIFE - sprite.spawn) / interval));
      const last = Math.floor((Math.min(t, sprite.spawn + sprite.crossTime) - sprite.spawn) / interval);
      for (let j = first; j <= last; j++) {
        const emitted = sprite.spawn + j * interval;
        const pose = spritePose(sprite, emitted, scene, settings, image.aspect);
        if (!pose) continue;
        const age = t - emitted;
        const seed = index * 977 + j * 13;
        const life = age / TRAIL_LIFE;
        const x = pose.x + dir * pose.w * (0.25 + hash01(seed) * 0.3) + dir * age * H * 0.05;
        const y = pose.y + (hash01(seed + 1) - 0.5) * pose.h * 0.9 + (hash01(seed + 2) - 0.5) * age * H * 0.12;
        const size = pose.h * (0.14 + hash01(seed + 3) * 0.22) * (1 - life * 0.7);
        drawGlint(Math.floor((sprite.hue * 5 + hash01(seed + 4) * 2) % 5), x, y, size, (1 - life) * (0.55 + 0.45 * amount), age * 2);
      }
    }
  }

  // ---- 絵 ----
  ctx.globalCompositeOperation = 'source-over';
  for (const { sprite, index } of visible) {
    const image = assets.images[sprite.imageIndex];
    if (!image) continue;
    const pose = spritePose(sprite, t, scene, settings, image.aspect);
    if (!pose) continue;
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.rotation);
    ctx.scale(pose.bounce, pose.bounce);
    if (sparkle.glow) {
      ctx.globalAlpha = 0.65 + 0.35 * amount;
      const pad = (image.glowPad / image.canvas.height) * pose.h;
      ctx.drawImage(image.glow, -pose.w / 2 - pad, -pose.h / 2 - pad, pose.w + pad * 2, pose.h + pad * 2);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(image.canvas, -pose.w / 2, -pose.h / 2, pose.w, pose.h);
    ctx.restore();

    // ときどき絵の上で「キラーン」と大きく光る
    if (hash01(index * 31 + 7) < amount * 0.45) {
      const shineAt = sprite.spawn + sprite.crossTime * (0.2 + hash01(index * 31 + 8) * 0.5);
      const age = t - shineAt;
      if (age >= 0 && age < 0.4) {
        ctx.globalCompositeOperation = 'lighter';
        const a = Math.sin((Math.PI * age) / 0.4);
        const sx = pose.x + (hash01(index + 11) - 0.5) * pose.w * 0.7;
        const sy = pose.y + (hash01(index + 12) - 0.5) * pose.h * 0.7;
        drawGlint(0, sx, sy, pose.h * 0.8 * a, a, age * 3);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  ctx.restore();
}

export function makeCanvas(width: number, height: number, willReadFrequently = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  if (willReadFrequently) canvas.getContext('2d', { willReadFrequently: true });
  return canvas;
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function sizeOf(preset: Settings['output']['size']) {
  const [width, height] = preset.split('x').map(Number);
  return { width, height };
}
