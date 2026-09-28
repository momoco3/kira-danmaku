// 生配信モード: ダウンロードした HTML の中で動くプログラムです。
// OBS の「ブラウザソース」で読み込むと、ソースが表示されるたびに弾幕が流れます。
// ふつうのブラウザで開いたときは、クリック / スペースキー / Enter で流れます。
//
// このファイルは vite.live.config.ts で1つの JS にまとめられ、HTML に埋め込まれます。
import { prepareAssets, renderFrame, type ArtSource, type TextSources } from '../lib/renderer';
import { buildScene, phraseHeight, type Scene } from '../lib/scene';
import { textInfo } from '../lib/textArt';
import type { Illustration, Settings } from '../types';

export type LiveConfig = {
  settings: Settings;
  /** イラスト（data URL） */
  images: string[];
  /** 文字の画像（data URL）。文字を出さないときは null */
  text?: { phrases: string[]; banner: string | null; bannerLines: number } | null;
};

declare global {
  interface Window {
    KIRA_CONFIG?: LiveConfig;
    /** OBS のブラウザソースの中で開かれていると存在する */
    obsstudio?: unknown;
  }
}

async function start() {
  const config = window.KIRA_CONFIG;
  if (!config) return;
  const canvas = document.getElementById('kira') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const hint = document.getElementById('kira-hint');
  const inObs = !!window.obsstudio;
  if (hint && inObs) hint.remove();

  const load = async (src: string): Promise<ArtSource & { image: HTMLImageElement }> => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight };
  };
  const illustrations: Illustration[] = await Promise.all(
    config.images.map(async (src, i) => ({ id: String(i), name: `image-${i}`, url: src, ...(await load(src)) })),
  );
  const text: TextSources | null = config.text
    ? {
        phrases: await Promise.all(config.text.phrases.map(load)),
        banner: config.text.banner ? await load(config.text.banner) : null,
        bannerLines: config.text.bannerLines,
      }
    : null;
  const sceneText = text ? textInfo(text) : undefined;

  // 配信ソフトの上では背景はいつも透明
  const settings: Settings = { ...config.settings, output: { ...config.settings.output, background: 'transparent' } };
  let width = 0;
  let height = 0;
  let assets = prepareAssets(illustrations, 1, { sources: text, phraseHeight: 1 });
  const resize = () => {
    width = Math.max(1, Math.round(window.innerWidth));
    height = Math.max(1, Math.round(window.innerHeight));
    canvas.width = width;
    canvas.height = height;
    assets = prepareAssets(illustrations, height * settings.flow.sizeMax, { sources: text, phraseHeight: phraseHeight(settings, width, height, sceneText?.banner) });
  };
  resize();
  window.addEventListener('resize', resize);

  // 流れている弾幕（何回も呼ぶと重なる）
  const waves: { scene: Scene; startedAt: number; settings: Settings }[] = [];
  let running = false;

  const loop = (now: number) => {
    ctx.clearRect(0, 0, width, height);
    for (let i = waves.length - 1; i >= 0; i--) {
      const wave = waves[i];
      const t = (now - wave.startedAt) / 1000;
      if (t > wave.scene.totalSeconds) waves.splice(i, 1);
    }
    for (const wave of waves) renderFrame(ctx, wave.scene, (now - wave.startedAt) / 1000, assets, wave.settings, false);
    if (waves.length) requestAnimationFrame(loop);
    else running = false;
  };

  const fire = () => {
    const seed = Math.floor(Math.random() * 1e9) + 1;
    const waveSettings: Settings = { ...settings, output: { ...settings.output, seed } };
    waves.push({ scene: buildScene(waveSettings, illustrations.length, width, height, sceneText), startedAt: performance.now(), settings: waveSettings });
    hint?.classList.add('hidden');
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  };

  // OBS: ソースが表示されたら流す（表示/非表示はホットキーでも切り替えられる）
  window.addEventListener('obsSourceVisibleChanged', (event) => {
    if ((event as CustomEvent<{ visible: boolean }>).detail?.visible) fire();
  });
  // ふつうのブラウザで試すとき
  window.addEventListener('pointerdown', fire);
  window.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      fire();
    }
  });
  // OBS で読み込まれた直後にも1回流す（「表示されたときに再読み込み」設定でも使えるように）
  if (inObs) fire();
}

void start();
