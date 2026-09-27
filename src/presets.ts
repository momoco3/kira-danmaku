// フィーバー度のプリセットと、最初に選ばれている設定です。
import type { Curve, FlowSettings, Settings, SparkleSettings } from './types';

export type FeverPreset = {
  id: string;
  name: string;
  description: string;
  color: string;
  flow: Pick<FlowSettings, 'intensity' | 'speed'>;
  sparkle: Pick<SparkleSettings, 'amount'>;
};

export const FEVER_PRESETS: FeverPreset[] = [
  { id: 'light', name: 'ちょいフィーバー', description: 'ぱらぱら流れる', color: 'var(--cyan)', flow: { intensity: 0.25, speed: 0.4 }, sparkle: { amount: 0.4 } },
  { id: 'fever', name: 'フィーバー', description: 'わっと流れる', color: 'var(--yellow)', flow: { intensity: 0.55, speed: 0.55 }, sparkle: { amount: 0.6 } },
  { id: 'super', name: '超フィーバー', description: '画面が埋まる', color: 'var(--pink)', flow: { intensity: 0.8, speed: 0.65 }, sparkle: { amount: 0.8 } },
  { id: 'limit', name: '限界突破', description: 'やりすぎ', color: 'var(--purple)', flow: { intensity: 1, speed: 0.8 }, sparkle: { amount: 1 } },
];

export function findFeverPreset(settings: Settings): FeverPreset | undefined {
  return FEVER_PRESETS.find(
    (p) => p.flow.intensity === settings.flow.intensity && p.flow.speed === settings.flow.speed && p.sparkle.amount === settings.sparkle.amount,
  );
}

export const CURVES: { value: Curve; label: string; description: string }[] = [
  { value: 'boom', label: 'ドカン', description: 'すぐ大量→長めに続く' },
  { value: 'build', label: 'じわじわ', description: 'だんだん増える' },
  { value: 'burst', label: '一瞬', description: 'どっと来てすぐ引く' },
  { value: 'wave', label: '波', description: '大波が何度も来る' },
];

export const DEFAULT_SETTINGS: Settings = {
  flow: { intensity: 0.55, speed: 0.55, curve: 'boom', sizeMin: 0.12, sizeMax: 0.32, wobble: 0.5, spin: 0.15, direction: 'rtl' },
  sparkle: { amount: 0.6, glow: true, glitter: true },
  output: { format: 'webm', size: '1920x1080', fps: 30, seconds: 5, background: 'transparent', seed: 1 },
};
