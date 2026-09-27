// 弾幕の「台本」を作るファイルです。
// どの絵が・いつ・どの高さから・どの速さで流れるかを、乱数の種から最初に全部決めておきます。
// だからプレビューと書き出しで、まったく同じ流れ方になります。
import type { Curve, Settings } from '../types';

export type Sprite = {
  imageIndex: number;
  /** 画面に入ってくる時刻（秒） */
  spawn: number;
  /** 画面を横切るのにかかる時間（秒） */
  crossTime: number;
  /** 絵の高さ（px） */
  size: number;
  /** 中心の高さ（px） */
  y: number;
  wobblePhase: number;
  wobbleSpeed: number;
  /** くるくる回る速さ（回転/秒）。0 なら回らない */
  spinSpeed: number;
  /** キラキラの色の傾向 */
  hue: number;
};

export type Scene = {
  width: number;
  height: number;
  sprites: Sprite[];
  /** 絵が出てくる時間（秒） */
  spawnSeconds: number;
  /** 動画全体の長さ（最後の絵が流れ切るまで） */
  totalSeconds: number;
  /** 量のグラフ用: 各時刻の「出てくる勢い」（0〜1） */
  envelope: (t: number) => number;
};

// 量の最大・最小（1秒あたりに出てくる枚数）。数字を変えると全体の量が変わります
const PEAK_RATE_MIN = 8;
const PEAK_RATE_MAX = 120;
const START_RATE = 1.5;

// 横切る時間（秒）: 速さ 0 のとき〜速さ 1 のとき
const CROSS_TIME_SLOW = 3.4;
const CROSS_TIME_FAST = 0.9;

/**
 * 盛り上がり方の形（u = 0〜1 は出てくる時間の中の位置）。
 * どれも「最初は少なく → 大量 → 最後にまた少なく」になるようにしています。
 */
export function curveShape(curve: Curve, u: number): number {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const smooth = (v: number) => {
    const x = clamp(v);
    return x * x * (3 - 2 * x);
  };
  switch (curve) {
    case 'boom':
      return smooth(u / 0.14) * (1 - smooth((u - 0.72) / 0.28));
    case 'build':
      return Math.pow(smooth(u / 0.7), 1.6) * (1 - smooth((u - 0.82) / 0.18));
    case 'burst':
      return smooth(u / 0.08) * Math.pow(1 - smooth((u - 0.2) / 0.8), 1.4);
    case 'wave': {
      const base = smooth(u / 0.12) * (1 - smooth((u - 0.8) / 0.2));
      return base * (0.45 + 0.55 * Math.pow(Math.sin(Math.PI * 3 * u), 2));
    }
  }
}

export function buildScene(settings: Settings, imageCount: number, width: number, height: number): Scene {
  const { flow, output } = settings;
  const random = createRandom(output.seed * 7919 + 17);
  const spawnSeconds = output.seconds;
  const peakRate = PEAK_RATE_MIN + (PEAK_RATE_MAX - PEAK_RATE_MIN) * Math.pow(flow.intensity, 1.3);
  const envelope = (t: number) => (t < 0 || t > spawnSeconds ? 0 : curveShape(flow.curve, t / spawnSeconds));
  const rateAt = (t: number) => START_RATE + (peakRate - START_RATE) * envelope(t);
  const baseCross = CROSS_TIME_SLOW + (CROSS_TIME_FAST - CROSS_TIME_SLOW) * flow.speed;

  // 高さは「レーン」に分けて、同じ高さに続けて出ないようにする
  const lanes = 14;
  let lastLane = -1;
  const sprites: Sprite[] = [];
  const dt = 1 / 240;
  let carry = random();
  let maxEnd = 0;
  for (let t = 0; t < spawnSeconds; t += dt) {
    carry += rateAt(t) * dt;
    while (carry >= 1) {
      carry -= 1;
      if (imageCount === 0) continue;
      // 小さめの絵を多めに（奥行きが出る）
      const sizeT = Math.pow(random(), 1.8);
      const size = height * (flow.sizeMin + (flow.sizeMax - flow.sizeMin) * sizeT);
      let lane = Math.floor(random() * lanes);
      if (lane === lastLane) lane = (lane + 1 + Math.floor(random() * (lanes - 1))) % lanes;
      lastLane = lane;
      const laneHeight = height / lanes;
      const y = Math.min(height - size * 0.35, Math.max(size * 0.35, (lane + 0.5) * laneHeight + (random() - 0.5) * laneHeight));
      // 大きい絵ほど少し速く（手前にあるように見える）
      const crossTime = (baseCross * (0.8 + random() * 0.45)) / (0.8 + 0.45 * sizeT);
      const spawn = t + random() * dt;
      sprites.push({
        imageIndex: Math.floor(random() * imageCount),
        spawn,
        crossTime,
        size,
        y,
        wobblePhase: random() * Math.PI * 2,
        wobbleSpeed: 1.2 + random() * 1.6,
        spinSpeed: random() < flow.spin ? (random() < 0.5 ? -1 : 1) * (0.6 + random() * 1.2) : 0,
        hue: random(),
      });
      maxEnd = Math.max(maxEnd, spawn + crossTime);
    }
  }
  // 小さい絵を奥、大きい絵を手前に描く
  sprites.sort((a, b) => a.size - b.size);

  return { width, height, sprites, spawnSeconds, totalSeconds: Math.max(spawnSeconds, maxEnd) + 0.2, envelope };
}

/** 時刻 t の絵の位置と傾き */
export function spritePose(sprite: Sprite, t: number, scene: Scene, settings: Settings, aspect: number) {
  const age = t - sprite.spawn;
  if (age < 0 || age > sprite.crossTime) return null;
  const w = sprite.size * aspect;
  const progress = age / sprite.crossTime;
  const travel = scene.width + w;
  const x = settings.flow.direction === 'rtl' ? scene.width + w / 2 - travel * progress : -w / 2 + travel * progress;
  const wobble = settings.flow.wobble;
  const phase = sprite.wobblePhase + age * sprite.wobbleSpeed * Math.PI * 2;
  const y = sprite.y + Math.sin(phase) * wobble * scene.height * 0.035;
  const rotation = sprite.spinSpeed ? age * sprite.spinSpeed * Math.PI * 2 : Math.sin(phase * 0.8) * wobble * 0.22;
  // 揺れに合わせて少しだけ弾む
  const bounce = 1 + Math.sin(phase * 2) * wobble * 0.05;
  return { x, y, w, h: sprite.size, rotation, bounce };
}

export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 整数から毎回同じ乱数を作る（キラキラの位置などに使う） */
export function hash01(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
