// 生配信モード用の HTML ファイルを作ります。
// イラスト（小さめに縮めたもの）と今の設定、生配信用のプログラムを1つの HTML にまとめます。
// 外部への通信はなく、OBS のブラウザソースで「ローカルファイル」として読み込めます。
import type { LiveConfig } from '../live/runtime';
import type { Illustration, Settings } from '../types';

/** 埋め込む絵の最大の高さ（px）。大きすぎると HTML が重くなるので縮める */
const MAX_IMAGE_HEIGHT = 640;

export async function buildLiveHtml(images: Illustration[], settings: Settings): Promise<string> {
  const runtime = await (await fetch(new URL('live-runtime.js', document.baseURI))).text();
  const config: LiveConfig = { settings, images: images.map(toDataUrl) };
  const safe = (text: string) => text.replace(/<\/(script)/gi, '<\\/$1');

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>キラ弾幕 生配信モード</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }
  canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; }
  #kira-hint { position: fixed; left: 16px; bottom: 16px; padding: 10px 16px; font: 700 16px system-ui, sans-serif;
    color: #fff; background: rgba(43, 33, 64, 0.85); border-radius: 999px; transition: opacity 0.4s; }
  #kira-hint.hidden { opacity: 0; }
</style>
</head>
<body>
<canvas id="kira"></canvas>
<div id="kira-hint">クリック / スペースキーで弾幕が流れます（OBS ではソースを表示するたびに流れます）</div>
<script>window.KIRA_CONFIG = ${safe(JSON.stringify(config))};</script>
<script>${safe(runtime)}</script>
</body>
</html>
`;
}

function toDataUrl(image: Illustration): string {
  const scale = Math.min(1, MAX_IMAGE_HEIGHT / image.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image.image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
