// 弾幕の「台本」を作るファイルです。
// どの絵が・いつ・どの高さから・どの速さで流れるかを、乱数の種から最初に全部決めておきます。
// だからプレビューと書き出しで、まったく同じ流れ方になります。
import type { Curve, Settings } from '../types';

export type Sprite = {
  /** true なら文字（imageIndex は文字の番号） */
  text: boolean;
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
  /** 一緒に流す文字の高さ（px） */
  phraseHeight: number;
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

/** 文字の数と、下に固定する文字の画像の形（横/縦・行数） */
export type SceneText = { count: number; banner: { aspect: number; lines: number } | null };

/**
 * 下に固定する文字の大きさ（px、ふちこみ）。
 * 画面の下 1/3 くらいを埋める大きさにして、横にはみ出すときだけ縮める
 */
export function bannerBox(settings: Settings, width: number, height: number, aspect: number) {
  const h = height * (0.18 + 0.16 * settings.text.size);
  const w = h * aspect;
  // 揺れや弾みではみ出さないよう、横は少し余白を残す
  const fit = Math.min(1, (width * 0.88) / w);
  return { w: w * fit, h: h * fit };
}

/**
 * 一緒に流す文字の高さ（px、ふちこみ）。
 * 縦長の画面でも大きくなりすぎないよう、短いほうの辺に合わせる。
 * 下に固定する文字があるときは、それより必ず小さく（1行の半分くらいまで）する
 */
export function phraseHeight(settings: Settings, width: number, height: number, banner: SceneText['banner'] = null) {
  const h = Math.min(width, height) * (0.06 + 0.08 * settings.text.size);
  if (settings.text.bottom === 'off' || !banner) return h;
  const bannerLine = bannerBox(settings, width, height, banner.aspect).h / banner.lines;
  return Math.min(h, bannerLine * 0.55);
}

/**
 * @param text 一緒に流す文字の数など（なければ文字は流れない）
 */
export function buildScene(settings: Settings, imageCount: number, width: number, height: number, text?: SceneText): Scene {
  const { flow, output } = settings;
  const textCount = settings.text.flow ? (text?.count ?? 0) : 0;
  const textHeight = phraseHeight(settings, width, height, text?.banner);
  // 文字の割合。絵がないときは文字だけ流す
  const textShare = imageCount === 0 ? 1 : 0.6 * settings.text.amount;
  const random = createRandom(output.seed * 7919 + 17);
  const spawnSeconds = output.seconds;
  const peakRate = PEAK_RATE_MIN + (PEAK_RATE_MAX - PEAK_RATE_MIN) * Math.pow(flow.intensity, 1.3);
  const envelope = (t: number) => (t < 0 || t > spawnSeconds ? 0 : curveShape(flow.curve, t / spawnSeconds));
  // 文字だけのときは、読めるように量を減らす
  const rateScale = imageCount === 0 && textCount > 0 ? 0.3 : 1;
  const rateAt = (t: number) => (START_RATE + (peakRate - START_RATE) * envelope(t)) * rateScale;
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
      if (imageCount === 0 && textCount === 0) continue;
      // 文字がないときは乱数を使わない（文字を足す前と同じ流れ方のまま）
      const isText = textCount > 0 && (imageCount === 0 || random() < textShare);
      // 小さめの絵を多めに（奥行きが出る）
      const sizeT = Math.pow(random(), 1.8);
      const size = isText
        ? textHeight * (0.8 + 0.4 * sizeT)
        : height * (flow.sizeMin + (flow.sizeMax - flow.sizeMin) * sizeT);
      let lane = Math.floor(random() * lanes);
      if (lane === lastLane) lane = (lane + 1 + Math.floor(random() * (lanes - 1))) % lanes;
      lastLane = lane;
      const laneHeight = height / lanes;
      const y = Math.min(height - size * 0.35, Math.max(size * 0.35, (lane + 0.5) * laneHeight + (random() - 0.5) * laneHeight));
      // 大きい絵ほど少し速く（手前にあるように見える）
      const crossTime = (baseCross * (0.8 + random() * 0.45)) / (0.8 + 0.45 * sizeT);
      const spawn = t + random() * dt;
      sprites.push({
        text: isText,
        imageIndex: Math.floor(random() * (isText ? textCount : imageCount)),
        spawn,
        crossTime,
        size,
        y,
        wobblePhase: random() * Math.PI * 2,
        wobbleSpeed: 1.2 + random() * 1.6,
        // 文字は回さない
        spinSpeed: random() < flow.spin && !isText ? (random() < 0.5 ? -1 : 1) * (0.6 + random() * 1.2) : 0,
        hue: random(),
      });
      maxEnd = Math.max(maxEnd, spawn + crossTime);
    }
  }
  // 小さい絵を奥、大きい絵を手前に描く。文字は読めるよう絵より手前
  sprites.sort((a, b) => Number(a.text) - Number(b.text) || a.size - b.size);

  return { width, height, sprites, spawnSeconds, totalSeconds: Math.max(spawnSeconds, maxEnd) + 0.2, envelope, phraseHeight: textHeight };
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
  const rotation = sprite.text ? 0 : sprite.spinSpeed ? age * sprite.spinSpeed * Math.PI * 2 : Math.sin(phase * 0.8) * wobble * 0.22;
  // 揺れに合わせて少しだけ弾む
  const bounce = 1 + Math.sin(phase * 2) * wobble * 0.05;
  return { x, y, w, h: sprite.size, rotation, bounce };
}

const BANNER_POP_IN = 0.45;
const BANNER_POP_OUT = 0.35;

/**
 * 下に固定する文字の位置と大きさ。
 * @param aspect 文字の画像の横/縦
 */
export function bannerPose(t: number, scene: Scene, settings: Settings, aspect: number) {
  const { width: W, height: H } = scene;
  const mode = settings.text.bottom;
  if (mode === 'off' || t < 0 || t > scene.totalSeconds) return null;
  const { w, h } = bannerBox(settings, W, H, aspect);
  let x = W / 2;
  let y = H - H * 0.03 - h / 2;

  // 出てくるときはポンッと弾んで、最後はしゅっと消える
  let scale = 1;
  let alpha = 1;
  if (t < BANNER_POP_IN) scale = easeOutBack(t / BANNER_POP_IN);
  const left = scene.totalSeconds - t;
  if (left < BANNER_POP_OUT) {
    const u = 1 - left / BANNER_POP_OUT;
    scale *= 1 + 0.12 * u;
    alpha = 1 - u;
  }

  // シェイク: 盛り上がっているときほど強く揺れる（1秒に24回ガタガタ）
  if (mode === 'shake') {
    const strength = Math.min(W, H) * 0.022 * (0.35 + 0.65 * scene.envelope(Math.min(t, scene.spawnSeconds)));
    const step = Math.floor(t * 24);
    x += (hash01(step * 2 + 1) - 0.5) * 2 * strength;
    y += (hash01(step * 2 + 2) - 0.5) * 1.4 * strength;
    scale *= 1 + (hash01(step * 2 + 3) - 0.5) * 0.04;
  }
  return { x, y, w, h, scale, alpha };
}

function easeOutBack(u: number) {
  const c = 2.2;
  const v = u - 1;
  return Math.max(0, 1 + (c + 1) * v * v * v + c * v * v);
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
