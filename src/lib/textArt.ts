// 文字を「ポップな太文字」の画像にするファイルです。
// 白いふち → 太い主線 → 色 → つやの順に重ねて、イラスト星と同じ雰囲気にします。
// 一度画像にしておくので、プレビュー・書き出し・生配信モードで同じ見た目になります。
import type { TextColor, TextSettings } from '../types';
import type { TextSources } from './renderer';
import type { SceneText } from './scene';

const FONT_FAMILY = '"Dela Gothic One", "Arial Black", "Hiragino Sans", "Noto Sans JP", sans-serif';
/** 文字の大きさ（px）。大きめに作って、使うときに縮める */
const FONT_PX = 200;
/** 1行ぶんの高さ（px）。画面の大きさに合わせるときの基準 */
export const TEXT_LINE_PX = Math.round(FONT_PX * 1.3);

const INK = '#2b2140';
const RAINBOW = ['#ffd93b', '#ff5fa2', '#4fd8ff', '#a4f23b', '#a57bff', '#ff9a3d'];
const SOLID: Record<Exclude<TextColor, 'rainbow'>, string> = { yellow: '#ffd93b', pink: '#ff5fa2', white: '#ffffff' };

/**
 * 文字の画像。phrases = 流す文字（1行ずつ）、banners = 下に固定する文字（全部の行）。
 * banners は折り返し方を変えたもの（折り返しなし・2つに折る・3つに折る）で、
 * 画面の形に合わせていちばん大きく出せるものを使う（縦長の画面なら折り返したもの）
 */
export type TextArt = {
  phrases: HTMLCanvasElement[];
  banners: { canvas: HTMLCanvasElement; lines: number }[];
};

export function textLines(text: Pick<TextSettings, 'content'>): string[] {
  return text.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** フォントを読み込んでから、文字の画像を作る */
export async function makeTextArt(text: Pick<TextSettings, 'content' | 'color'>): Promise<TextArt | null> {
  const lines = textLines(text);
  if (!lines.length) return null;
  try {
    await document.fonts.load(`${FONT_PX}px "Dela Gothic One"`, lines.join(''));
  } catch {
    // 読み込めなくても、ほかの太いフォントで描く
  }
  return {
    phrases: lines.map((line) => drawText([line], text.color)),
    banners: wrapVariants(lines).map((wrapped) => ({ canvas: drawText(wrapped, text.color), lines: wrapped.length })),
  };
}

// ---- 折り返し ----
/** 行の頭に来てはいけない文字（のばし棒・小さい字・句読点・閉じかっこ） */
const NO_LINE_START = /[ーぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ、。，．・：；）」』】〕～〜…‥)\]}〉》.,:;~-]/;
const MARK = /[!！?？]/;
const WORD = /[A-Za-z0-9]/;
const KANJI = /\p{Script=Han}/u;

/** 折り返しなし・2つに折る・3つに折る の3通り（同じになるものは1つにまとめる） */
function wrapVariants(lines: string[]): string[][] {
  const variants: string[][] = [];
  for (const pieces of [1, 2, 3]) {
    const wrapped = lines.flatMap((line) => splitLine(line, pieces));
    if (wrapped.length > 8) break;
    if (!variants.some((v) => v.join('\n') === wrapped.join('\n'))) variants.push(wrapped);
  }
  return variants;
}

/** 1行をだいたい同じ長さに分ける。「ー」や小さい字が行の頭に来ない、「！！！」はまとめる */
function splitLine(line: string, pieces: number): string[] {
  const chars = Array.from(line);
  // 短い行（6文字くらいまで）は分けない。長い行ほど多めに分けられる
  pieces = Math.min(pieces, Math.floor(chars.length / 3.5));
  if (pieces <= 1) return [line];
  const canBreak = (i: number) => {
    const prev = chars[i - 1];
    const next = chars[i];
    if (next === ' ' || prev === ' ' || next === '　' || prev === '　') return true;
    if (NO_LINE_START.test(next)) return false;
    if (MARK.test(next) && MARK.test(prev)) return false;
    if (WORD.test(next) && WORD.test(prev)) return false;
    // 「天才」などの漢字の熟語は分けない
    if (KANJI.test(next) && KANJI.test(prev)) return false;
    return true;
  };
  const breaks: number[] = [];
  let from = 1;
  for (let k = 1; k < pieces; k++) {
    const ideal = (chars.length * k) / pieces;
    // 行の最後の「！！」の前・「！」のすぐあと・空白のところは、切れ目として選ばれやすくする
    const goodBreak = (i: number) =>
      (MARK.test(chars[i]) && chars.slice(i).every((c) => MARK.test(c))) ||
      (MARK.test(chars[i - 1]) && !MARK.test(chars[i])) ||
      /[ 　]/.test(chars[i - 1]);
    const cost = (i: number) => Math.abs(i - ideal) - (goodBreak(i) ? 3 : 0);
    let best = -1;
    for (let i = from; i < chars.length; i++) {
      if (canBreak(i) && (best < 0 || cost(i) < cost(best))) best = i;
    }
    // 残りが短すぎる分け方はしない
    if (best < 0 || chars.length - best < 2 || best - (breaks.at(-1) ?? 0) < 2) break;
    breaks.push(best);
    from = best + 1;
  }
  const result: string[] = [];
  let start = 0;
  for (const b of [...breaks, chars.length]) {
    const piece = chars.slice(start, b).join('').trim();
    if (piece) result.push(piece);
    start = b;
  }
  return result;
}

function drawText(lines: string[], color: TextColor): HTMLCanvasElement {
  const font = `${FONT_PX}px ${FONT_FAMILY}`;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  // 1文字ずつの位置（カラフルのときに1文字ずつ色を変えるため）
  const layout = lines.map((line) => {
    const chars = Array.from(line);
    const widths = chars.map((c) => measure.measureText(c).width);
    return { chars, widths, width: widths.reduce((a, b) => a + b, 0) };
  });
  const rim = FONT_PX * 0.2;
  const pad = Math.ceil(rim + FONT_PX * 0.08);
  const width = Math.ceil(Math.max(...layout.map((l) => l.width)) + pad * 2);
  const height = Math.ceil(lines.length * TEXT_LINE_PX + pad * 2 - (TEXT_LINE_PX - FONT_PX * 1.1));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d')!;
  // 色を塗った文字だけの画像（つやを文字の中にだけ乗せるため別に作る）
  const fill = document.createElement('canvas');
  fill.width = width;
  fill.height = height;
  const f = fill.getContext('2d')!;

  for (const ctx of [g, f]) {
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
  }

  let colorIndex = 0;
  const each = (draw: (char: string, x: number, y: number, index: number) => void) => {
    layout.forEach((line, row) => {
      let x = (width - line.width) / 2;
      const y = pad + FONT_PX * 0.55 + row * TEXT_LINE_PX;
      line.chars.forEach((char, i) => {
        draw(char, x, y, colorIndex + i);
        x += line.widths[i];
      });
      colorIndex += line.chars.length;
    });
    colorIndex = 0;
  };

  // 1. いちばん外の白いふち（少し下にずらした影も兼ねる）
  g.strokeStyle = '#ffffff';
  g.lineWidth = rim * 2;
  each((char, x, y) => g.strokeText(char, x, y + FONT_PX * 0.03));
  // 2. 太い主線
  g.strokeStyle = INK;
  g.lineWidth = FONT_PX * 0.2;
  each((char, x, y) => g.strokeText(char, x, y));
  // 3. 色
  each((char, x, y, i) => {
    f.fillStyle = color === 'rainbow' ? RAINBOW[i % RAINBOW.length] : SOLID[color];
    f.fillText(char, x, y);
  });
  // 4. つや（文字の上半分をうっすら白く）
  f.globalCompositeOperation = 'source-atop';
  layout.forEach((_, row) => {
    const top = pad + row * TEXT_LINE_PX;
    const shine = f.createLinearGradient(0, top, 0, top + FONT_PX * 0.55);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
    f.fillStyle = shine;
    f.fillRect(0, top, width, FONT_PX * 0.55);
  });
  g.drawImage(fill, 0, 0);
  return canvas;
}

/** 描画用の形にする */
export function toTextSources(art: TextArt | null): TextSources | null {
  if (!art) return null;
  const source = (c: HTMLCanvasElement) => ({ image: c, width: c.width, height: c.height });
  return { phrases: art.phrases.map(source), banners: art.banners.map((b) => ({ source: source(b.canvas), lines: b.lines })) };
}

/** 台本づくりに使う文字の情報 */
export function textInfo(sources: TextSources): SceneText {
  return {
    count: sources.phrases.length,
    banners: sources.banners.map((b) => ({ aspect: b.source.width / b.source.height, lines: b.lines })),
  };
}
