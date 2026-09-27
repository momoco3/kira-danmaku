// アプリ全体で使う「データの形」をまとめたファイルです。

/** 読み込んだイラスト */
export type Illustration = {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  image: HTMLImageElement;
};

/** 盛り上がり方（量の変化のしかた） */
export type Curve = 'boom' | 'build' | 'burst' | 'wave';

export type FlowSettings = {
  /** フィーバー度（ピーク時の量） 0〜1 */
  intensity: number;
  curve: Curve;
  /** 流れる速さ 0〜1 */
  speed: number;
  /** 絵の大きさ（画面の高さに対する割合） */
  sizeMin: number;
  sizeMax: number;
  /** ゆらゆら揺れる量 0〜1 */
  wobble: number;
  /** くるくる回る絵の割合 0〜1 */
  spin: number;
  direction: 'rtl' | 'ltr';
};

/** キラキラの見た目: 光（キラッ）/ 主線の太いイラストの星 / 両方 */
export type SparkleStyle = 'star' | 'glint' | 'mix';

export type SparkleSettings = {
  /** キラキラの量 0〜1 */
  amount: number;
  style: SparkleStyle;
  /** 絵のまわりをふんわり光らせる */
  glow: boolean;
  /** 画面全体にも星をまたたかせる */
  glitter: boolean;
};

export type OutputFormat = 'webm' | 'mp4';

export type SizePreset = '1920x1080' | '1280x720' | '1080x1920' | '1080x1080';

export type OutputSettings = {
  format: OutputFormat;
  size: SizePreset;
  fps: 30 | 60;
  /** 絵が流れ出てくる時間（秒）。このあと、残った絵が流れ切るまでの時間が足されます */
  seconds: 3 | 5 | 8 | 12;
  /** 背景。'transparent' = 透過（WebM のみ）/ 'image' = 背景画像 / それ以外は色（#00ff00 など） */
  background: string;
  /** 乱数の種。変えると流れ方のパターンが変わる */
  seed: number;
};

/** 文字の色: カラフル（1文字ずつ色が変わる）/ 単色 */
export type TextColor = 'rainbow' | 'yellow' | 'pink' | 'white';

/** 文字を下に固定するか: しない / 固定 / 固定＋シェイク */
export type TextBottom = 'off' | 'fixed' | 'shake';

export type TextSettings = {
  /** 流す文字。1行に1つ。空なら文字は出ない */
  content: string;
  /** イラストと一緒に流す */
  flow: boolean;
  bottom: TextBottom;
  color: TextColor;
  /** 文字の大きさ 0〜1 */
  size: number;
  /** 一緒に流すときの文字の割合 0〜1 */
  amount: number;
};

export type Settings = {
  flow: FlowSettings;
  sparkle: SparkleSettings;
  text: TextSettings;
  output: OutputSettings;
};
