# キラ弾幕（KiraDanmaku）

**Make a sparkly illustration barrage (danmaku) video for streams — right in your browser.**
イラストを入れると、キラキラしながら右から左へドバッと流れる「弾幕」動画が作れるツールです。

> 🔒 **Uploaded images are processed locally in your browser and are not uploaded to a server.**
> 読み込んだ画像はすべてお使いのブラウザの中だけで処理され、サーバーには一切送信されません。

<img src="docs/screenshot.png" alt="キラ弾幕の画面" width="800">

<sub>※ スクリーンショットの星のステッカーはサンプル用に描いたものです。</sub>

---

## どんなときに使う？

配信で「わたしすげーー！！」と叫んだ瞬間に、自分のイラストがニコニコの弾幕みたいに画面を流れていく——そんな演出用の動画を作ります。

- 最初は少なく → すぐ大量 → 最後にまた少なく、と自然に盛り上がって引いていきます
- 絵のうしろに星の尾、ときどき大きな星がポンッ、画面全体にも星がまたたきます（主線の太いカラフルな**イラスト星**／光の**キラキラ**／両方 から選べます）
- **背景透過の WebM** で書き出せるので、OBS などの配信ソフトにそのまま重ねられます
- **グリーンバックの MP4** も作れます（どのソフトでもクロマキーで抜いて使えます）
- **背景画像つきの MP4** も作れます（そのまま SNS に投稿したり、動画に入れたりできます）
- **文字**も流せます（「わたしすげーー！！」をイラストと一緒に流す・画面の下にドンと固定・固定してガタガタ揺らす）
- **生配信モード**: 動画を作らずに、OBS の上で**その場で**弾幕を流せます（毎回違う流れ方・連打で重なる）

## 主な機能

| 機能 | 内容 |
| --- | --- |
| イラスト | 何枚でも。ランダムに混ざって流れます（透明背景の PNG / WebP がおすすめ） |
| 文字 | ポップな太文字（白いふち＋太い主線、回転なし）。1行に1つ書くと混ざって流れる。**イラストと一緒に流す** / **下に固定** / **下に固定＋シェイク**、色（カラフル / 黄 / ピンク / 白）・大きさ・量。文字だけでも使えます |
| フィーバー度 | ちょいフィーバー / フィーバー / 超フィーバー / 限界突破 のプリセット＋スライダー |
| 盛り上がり方 | ドカン（すぐ大量→長めに続く）/ じわじわ / 一瞬 / 波 |
| 流れ方 | 速さ・大きさ・大きさのバラつき・ゆらゆら・くるくる・向き（右→左 / 左→右） |
| キラキラ | 見た目（イラスト星 / キラキラ / 両方）、量、白いふちで光らせる、画面全体の星 |
| プレビュー | 書き出しと同じ動き。量のグラフの上をドラッグして好きな時刻を確認 |
| パターン | 「流れ方のパターンを変える」で配置だけを変えられます |
| 背景 | 透過（WebM）/ グリーン・ブルー・黒・白 / **背景画像**（画面いっぱいに合わせて切り取り） |
| 書き出し | WebM（背景透過 or 色 or 画像）/ MP4（背景色 or 画像）、YouTube 横（1920×1080）・YouTube ショート（1080×1920）・横・軽め（1280×720）・正方形、30 / 60fps |
| 生配信モード | イラストと設定を1つの HTML にまとめてダウンロード → OBS のブラウザソースで、表示するたびに弾幕が流れる |

## 使い方

1. **01 Images** にイラストを入れる
2. 文字も出したいときは **02 Text** に書く（例: わたしすげーー！！）
3. **04 Fever** でフィーバー度を選ぶ（**05 Flow** / **06 Sparkle** で細かく調整）
4. **07 Output** で形式・背景・サイズ・長さを選ぶ（背景を「🖼 画像」にすると背景画像を選べて、MP4 になります）
5. 「Generate」→「Download」

### OBS で使うには

- **透過 WebM**: ソースに「メディアソース」を追加してファイルを選ぶだけで、絵だけが配信画面に重なります。
  「ループ」はオフ、「ソースがアクティブになったときに再生を再開する」をオンにしておくと、シーンやソースの表示を切り替えるたびに最初から流れます（ホットキーで表示の切り替えを割り当てると便利です）。
- **グリーンバック MP4**: 同じく「メディアソース」で追加し、フィルタの「クロマキー」で緑を抜きます。

### 生配信モード（OBS のブラウザソース）

動画ファイルを作らずに、配信中にその場で弾幕を流すモードです。

1. **09 Live** の「生配信用ファイル（HTML）をダウンロード」を押す（`kira-danmaku-live.html`）
2. OBS の「ソース」の＋から **ブラウザ** を追加し、**ローカルファイル** にチェックを入れてそのファイルを選ぶ
3. 幅・高さを配信画面と同じにする（例: 1920 × 1080）
4. ソースを**表示するたびに**弾幕が流れます。「表示 / 非表示」にホットキーを割り当てると、キー1つで流せます

- 流れ方（配置）は毎回変わります。続けて出すと弾幕が重なります
- HTML にはイラスト（小さめに縮めたもの）・文字（画像にしたもの）と設定が入っていて、外部への通信はありません
- 設定やイラストを変えたら、もう一度ダウンロードして差し替えてください
- 配信画面に重ねて使うので、生配信モードの背景はいつも透明です（背景画像は使いません）
- ふつうのブラウザで開くと、クリック / スペースキー / Enter で流れます（「このブラウザで試す」ボタンでも確認できます）

しくみ: OBS のブラウザソースが送ってくる「ソースが表示された」合図（`obsSourceVisibleChanged`）を受け取って流しています。

### ブラウザ対応

| 形式 | PC の Chrome / Edge | Firefox | Safari / iPhone |
| --- | --- | --- | --- |
| WebM（背景透過） | ✅ | ブラウザ次第 | ❌ |
| MP4（背景色） | ✅ | ✅（新しい版） | ✅ |

背景透過の WebM は「色の映像」と「透明度の映像」の2本をブラウザ標準の WebCodecs（VP9）で作り、
自作の WebM 書き出し（`src/lib/webmWriter.ts`）で1つのファイルにまとめています。

---

## ローカルで動かす

[Node.js](https://nodejs.org/)（v20 以上、推奨 v22）が必要です。

```bash
npm install
```

```bash
npm run dev
```

### ビルド・公開

```bash
npm run build
```

`dist/` が公開用ファイルです。`main` に push すると `.github/workflows/deploy.yml` が GitHub Pages に自動公開します（初回だけ Settings → Pages → Source を「GitHub Actions」に）。

---

## どこを編集すればいい？

| やりたいこと | 編集するファイル |
| --- | --- |
| フィーバー度のプリセット・最初の設定 | `src/presets.ts` |
| 全体の量（1秒あたりの最大枚数など） | `src/lib/scene.ts` の `PEAK_RATE_MAX` など |
| 盛り上がり方の形 | `src/lib/scene.ts` の `curveShape` |
| 流れる速さの範囲 | `src/lib/scene.ts` の `CROSS_TIME_SLOW` / `CROSS_TIME_FAST` |
| キラキラの色・形 | `src/lib/renderer.ts` の `GLINT_COLORS` / `makeGlint`（光）、`STAR_COLORS` / `makeStar`（イラスト星） |
| 文字の見た目（色・ふち） | `src/lib/textArt.ts` の `RAINBOW` / `drawText` |
| 下に固定する文字の大きさ / 流れる文字の大きさ / シェイクの強さ | `src/lib/scene.ts` の `bannerBox` / `phraseHeight` / `bannerPose` |
| 画質（ビットレート） | `src/lib/encodeVideo.ts` の `bitrateFor` |
| 色 | `src/index.css` の `:root` |

### ファイル構成

```
kira-danmaku/
├─ index.html / vite.config.ts / package.json
├─ vite.live.config.ts       … 生配信モードのプログラムを1つの JS にまとめる設定（npm run build:live）
├─ public/favicon.svg
├─ docs/                     … README 用スクリーンショット
├─ .github/workflows/deploy.yml … GitHub Pages 自動公開
└─ src/
   ├─ App.tsx                … 画面の構成と状態管理
   ├─ types.ts / presets.ts  … データの形・プリセット・初期設定
   ├─ live/runtime.ts        … 生配信モードで動くプログラム（HTML に埋め込まれる）
   ├─ components/
   │  ├─ ImageList.tsx       … イラストの読み込み
   │  ├─ PreviewPlayer.tsx   … プレビュー・量のグラフ・シーク
   │  ├─ SettingsPanels.tsx  … フィーバー度・流れ方・キラキラ・書き出し設定
   │  ├─ LivePanel.tsx       … 生配信モードのダウンロード・説明
   │  ├─ ExportPanel.tsx / StickyGenerateBar.tsx … 生成・保存
   │  └─ Panel / Controls / Stickers / Header … 共通の部品
   └─ lib/
      ├─ scene.ts            … 弾幕の台本（いつ・どこに・どの速さで流れるか）
      ├─ renderer.ts         … 1コマの描画（絵・文字・光・キラキラ）
      ├─ textArt.ts          … 文字をポップな太文字の画像にする
      ├─ encodeVideo.ts      … WebM / MP4 の書き出し
      ├─ webmWriter.ts       … WebM ファイルの組み立て（背景透過対応）
      ├─ liveHtml.ts         … 生配信用 HTML の組み立て
      └─ loadImages.ts / download.ts / estimate.ts
```

---

## 利用ライブラリとライセンス

### アプリに含まれるもの

| パッケージ | 用途 | ライセンス |
| --- | --- | --- |
| [react](https://github.com/facebook/react) / react-dom（＋依存の scheduler） | 画面の構築 | MIT |
| [mp4-muxer](https://github.com/Vanilagy/mp4-muxer)（＋型定義のみの依存 @types/dom-webcodecs 等） | MP4 ファイルの組み立て | MIT |
| [@fontsource/dela-gothic-one](https://fontsource.org/fonts/dela-gothic-one) | ロゴ・見出し・流す文字のフォント | OFL-1.1（フォント） |

- 動画の圧縮はブラウザ標準の WebCodecs（VP9 / H.264）です
- WebM の組み立ては自作（`src/lib/webmWriter.ts`）です
- GPL 系のライブラリは使っていません

### 開発時のみ（アプリには含まれません）

| パッケージ | 用途 | ライセンス |
| --- | --- | --- |
| vite / @vitejs/plugin-react | 開発サーバー・ビルド | MIT |
| typescript | 型チェック | Apache-2.0 |
| @types/react / @types/react-dom / @types/node | 型定義 | MIT |
| oxlint | コードチェック | MIT |

## プライバシー

- **Uploaded images are processed locally in your browser and are not uploaded to a server.**
- 外部への通信・解析ツール・広告・Cookie はありません。フォントも同梱です

## 関連ツール

- [FrameBop](https://github.com/momoco3/framebop) … 画像を並べて GIF アニメを作る
- [Yurapoyo](https://github.com/momoco3/yurapoyo) … 絵2枚でまばたき＆ゆらゆらループ

## ライセンス

[MIT License](./LICENSE)
