import { defineConfig } from 'vite';

// 生配信モードのプログラム（src/live/runtime.ts）を、HTML に埋め込める1つの JS にまとめる設定。
// できたファイルは public/live-runtime.js に置かれ、アプリがダウンロード用 HTML を作るときに読み込みます。
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: false,
    lib: {
      entry: 'src/live/runtime.ts',
      name: 'KiraLive',
      formats: ['iife'],
      fileName: () => 'live-runtime.js',
    },
  },
});
