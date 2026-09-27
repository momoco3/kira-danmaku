// 動画を書き出すファイルです。
// ・WebM（VP9、背景透過）… OBS などの配信ソフトにそのまま重ねられる
// ・MP4（H.264、背景色あり）… どのソフトでも使える。グリーンバックにしてクロマキーで抜く
// 圧縮はブラウザ標準の WebCodecs。WebM は自作の webmWriter、MP4 は mp4-muxer でファイルにまとめます。
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { OutputFormat } from '../types';
import { writeWebm, type WebmFrame } from './webmWriter';

export type VideoJob = {
  format: OutputFormat;
  width: number;
  height: number;
  fps: number;
  seconds: number;
  /** 背景を透過にするか（WebM のみ） */
  transparent: boolean;
  /** 時刻 t（秒）のコマを canvas に描く */
  render: (ctx: CanvasRenderingContext2D, t: number) => void;
};

const VP9_CODECS = ['vp09.00.40.08', 'vp09.00.31.08', 'vp09.00.10.08'];

/** このブラウザで書き出せる形式 */
export async function detectSupport(width = 1920, height = 1080) {
  const webm = !!(await firstSupported(VP9_CODECS, { width, height, bitrate: 8e6 }));
  const mp4 = !!(await firstSupported(h264Candidates(width, height), { width, height, bitrate: 8e6 }));
  // 透過は「色」と「透明度」を別々に VP9 でエンコードして作るので、VP9 が使えれば OK
  return { webmTransparent: webm, webm, mp4 };
}

export function bitrateFor(width: number, height: number, fps: number) {
  return Math.round(width * height * fps * 0.11);
}

export async function encodeVideo(job: VideoJob, onProgress: (ratio: number) => void): Promise<Blob> {
  return job.format === 'webm' ? encodeWebm(job, onProgress) : encodeMp4(job, onProgress);
}

// ---------- WebM（VP9） ----------

async function encodeWebm(job: VideoJob, onProgress: (ratio: number) => void): Promise<Blob> {
  const { width, height, fps, transparent } = job;
  const bitrate = bitrateFor(width, height, fps);
  const codec = await firstSupported(VP9_CODECS, { width, height, bitrate });
  if (!codec) throw new Error('このブラウザは WebM の書き出しに対応していません（PC の Chrome / Edge をお使いください）');

  const canvas = makeCanvas(width, height);
  // 透過のときは透明度を毎コマ読み出すので、読み出しの速い設定にする
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: transparent })!;
  // 透明度の映像（I420 形式）。明るさ = 透明度（0 = 透明 / 255 = 見える）、色はなし（128）
  const lumaSize = width * height;
  const alphaYuv = transparent ? new Uint8Array(lumaSize * 1.5) : null;
  if (alphaYuv) alphaYuv.fill(128, lumaSize);

  const colorChunks = new Map<number, { key: boolean; data: Uint8Array }>();
  const alphaChunks = new Map<number, Uint8Array>();
  let failure: Error | null = null;
  const keep = (map: 'color' | 'alpha') => (chunk: EncodedVideoChunk) => {
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    if (map === 'color') colorChunks.set(chunk.timestamp, { key: chunk.type === 'key', data });
    else alphaChunks.set(chunk.timestamp, data);
  };
  const colorEncoder = new VideoEncoder({ output: keep('color'), error: (e) => (failure = e) });
  colorEncoder.configure({ codec, width, height, bitrate, framerate: fps });
  const alphaEncoder = transparent ? new VideoEncoder({ output: keep('alpha'), error: (e) => (failure = e) }) : null;
  alphaEncoder?.configure({ codec, width, height, bitrate: Math.round(bitrate * 0.4), framerate: fps });

  const totalFrames = Math.ceil(job.seconds * fps);
  const frameDuration = Math.round(1e6 / fps);
  for (let i = 0; i < totalFrames; i++) {
    if (failure) throw failure;
    job.render(ctx, i / fps);
    const timestamp = i * frameDuration;
    const keyFrame = i % (fps * 2) === 0;

    const colorFrame = new VideoFrame(canvas, { timestamp, duration: frameDuration, alpha: 'discard' });
    colorEncoder.encode(colorFrame, { keyFrame });
    colorFrame.close();

    if (alphaEncoder && alphaYuv) {
      // RGB → YUV の変換を通すと黒が 16・白が 235 に寄ってしまうので、
      // 透明度の値をそのまま明るさとして書き込む
      const pixels = ctx.getImageData(0, 0, width, height).data;
      for (let p = 0, a = 3; p < lumaSize; p++, a += 4) alphaYuv[p] = pixels[a];
      const alphaFrame = new VideoFrame(alphaYuv, {
        format: 'I420',
        codedWidth: width,
        codedHeight: height,
        timestamp,
        duration: frameDuration,
        colorSpace: { fullRange: true, matrix: 'bt709', primaries: 'bt709', transfer: 'bt709' },
      });
      alphaEncoder.encode(alphaFrame, { keyFrame });
      alphaFrame.close();
    }

    while (colorEncoder.encodeQueueSize > 4 || (alphaEncoder && alphaEncoder.encodeQueueSize > 4)) {
      await waitForDequeue(colorEncoder.encodeQueueSize > 4 ? colorEncoder : alphaEncoder!);
    }
    onProgress((i + 1) / totalFrames);
  }
  await colorEncoder.flush();
  await alphaEncoder?.flush();
  colorEncoder.close();
  alphaEncoder?.close();
  if (failure) throw failure;

  const frames: WebmFrame[] = [...colorChunks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, chunk]) => ({ timestamp, key: chunk.key, data: chunk.data, alpha: alphaChunks.get(timestamp) }));
  return writeWebm({ width, height, durationMs: (totalFrames * 1000) / fps, frames, alpha: transparent });
}

// ---------- MP4（H.264） ----------

async function encodeMp4(job: VideoJob, onProgress: (ratio: number) => void): Promise<Blob> {
  const { width, height, fps } = job;
  const bitrate = bitrateFor(width, height, fps);
  const codec = await firstSupported(h264Candidates(width, height), { width, height, bitrate });
  if (!codec) throw new Error('このブラウザは MP4 (H.264) の書き出しに対応していません');

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height, frameRate: fps },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  let failure: Error | null = null;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (failure = e) });
  encoder.configure({ codec, width, height, bitrate, framerate: fps });

  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  const totalFrames = Math.ceil(job.seconds * fps);
  const frameDuration = Math.round(1e6 / fps);
  for (let i = 0; i < totalFrames; i++) {
    if (failure) throw failure;
    job.render(ctx, i / fps);
    const frame = new VideoFrame(canvas, { timestamp: i * frameDuration, duration: frameDuration });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    while (encoder.encodeQueueSize > 4) await waitForDequeue(encoder);
    onProgress((i + 1) / totalFrames);
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

// ---------- 共通 ----------

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function h264Candidates(width: number, height: number) {
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  const levels = macroblocks <= 3600 ? ['1f', '28', '33'] : macroblocks <= 8192 ? ['28', '33'] : ['33'];
  return levels.flatMap((level) => ['6400', '4d00', '4200'].map((profile) => `avc1.${profile}${level}`));
}

async function firstSupported(codecs: string[], base: Omit<VideoEncoderConfig, 'codec'>): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  for (const codec of codecs) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({ ...base, codec });
      if (supported) return codec;
    } catch {
      // 次の候補へ
    }
  }
  return null;
}

// タイマーで待つと、タブが裏にあるとき極端に遅くなるため dequeue イベントを使う
function waitForDequeue(encoder: VideoEncoder) {
  return new Promise<void>((resolve) => {
    if ('ondequeue' in encoder) encoder.addEventListener('dequeue', () => resolve(), { once: true });
    else setTimeout(resolve, 5);
  });
}
