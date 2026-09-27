// 設定エリアの中身（フィーバー度のプリセット・流れ方・キラキラ・書き出し）です。
import type { CSSProperties } from 'react';
import { formatBytes } from '../lib/estimate';
import { CURVES, FEVER_PRESETS, type FeverPreset } from '../presets';
import type { Curve, FlowSettings, OutputSettings, SizePreset, SparkleSettings } from '../types';
import { ChoiceButtons, Slider, Switch } from './Controls';
import styles from './SettingsPanels.module.css';

// ---- フィーバー度のプリセット ----
export function FeverPresets({ activeId, onSelect }: { activeId: string | undefined; onSelect: (preset: FeverPreset) => void }) {
  return (
    <div className={styles.presetGrid} role="group" aria-label="フィーバー度">
      {FEVER_PRESETS.map((preset, i) => (
        <button
          key={preset.id}
          type="button"
          className={styles.preset}
          style={{ '--accent': preset.color } as CSSProperties}
          aria-pressed={preset.id === activeId}
          onClick={() => onSelect(preset)}
        >
          <span className={styles.presetName}>{preset.name}</span>
          <span className={styles.presetMeter} aria-hidden="true">
            {'🔥'.repeat(i + 1)}
          </span>
          <span className={styles.presetDescription}>{preset.description}</span>
        </button>
      ))}
    </div>
  );
}

// ---- 流れ方 ----
/** 大きさは「全体の大きさ」と「バラつき」の2つのスライダーで決める */
const SIZE_BASE = 0.12;
const SIZE_RANGE = 0.38;

export function FlowControls({ flow, onChange }: { flow: FlowSettings; onChange: (patch: Partial<FlowSettings>) => void }) {
  const size = (flow.sizeMax - SIZE_BASE) / SIZE_RANGE;
  const variance = (1 - flow.sizeMin / flow.sizeMax) / 0.8;
  const setSize = (nextSize: number, nextVariance: number) => {
    const sizeMax = SIZE_BASE + SIZE_RANGE * nextSize;
    onChange({ sizeMax, sizeMin: sizeMax * (1 - 0.8 * nextVariance) });
  };

  return (
    <div className={styles.stack}>
      <div>
        <p className={styles.label}>盛り上がり方</p>
        <ChoiceButtons<Curve>
          label="盛り上がり方"
          value={flow.curve}
          onChange={(curve) => onChange({ curve })}
          columns={2}
          choices={CURVES.map((c) => ({ value: c.value, label: c.label, sub: c.description }))}
        />
      </div>
      <Slider label="フィーバー度" description="いちばん多いときの量" value={flow.intensity} onChange={(intensity) => onChange({ intensity })} color="var(--pink)" />
      <Slider label="速さ" description="画面を横切る速さ" value={flow.speed} onChange={(speed) => onChange({ speed })} color="var(--sky)" />
      <Slider label="大きさ" value={clamp01(size)} onChange={(v) => setSize(v, clamp01(variance))} color="var(--lime)" />
      <Slider label="大きさのバラつき" description="大小まぜると奥行きが出る" value={clamp01(variance)} onChange={(v) => setSize(clamp01(size), v)} color="var(--lime)" />
      <Slider label="ゆらゆら" description="上下にゆれて弾む" value={flow.wobble} onChange={(wobble) => onChange({ wobble })} color="var(--cyan)" />
      <Slider label="くるくる" description="回転する絵の割合" value={flow.spin} onChange={(spin) => onChange({ spin })} color="var(--purple)" />
      <div>
        <p className={styles.label}>向き</p>
        <ChoiceButtons<FlowSettings['direction']>
          label="流れる向き"
          value={flow.direction}
          onChange={(direction) => onChange({ direction })}
          columns={2}
          choices={[
            { value: 'rtl', label: '右 → 左', sub: 'ニコニコ風' },
            { value: 'ltr', label: '左 → 右' },
          ]}
        />
      </div>
    </div>
  );
}

// ---- キラキラ ----
export function SparkleControls({ sparkle, onChange }: { sparkle: SparkleSettings; onChange: (patch: Partial<SparkleSettings>) => void }) {
  return (
    <div className={styles.stack}>
      <Slider label="キラキラの量" description="絵のうしろの光の粒・キラーン" value={sparkle.amount} onChange={(amount) => onChange({ amount })} color="var(--yellow)" />
      <Switch label="ふんわり光る" description="絵のまわりを白く光らせる" checked={sparkle.glow} onChange={(glow) => onChange({ glow })} />
      <Switch label="画面全体の星" description="量に合わせて画面中で星がまたたく" checked={sparkle.glitter} onChange={(glitter) => onChange({ glitter })} />
    </div>
  );
}

// ---- 書き出し ----
const BACKGROUNDS = [
  { value: '#00ff00', label: 'グリーン' },
  { value: '#0000ff', label: 'ブルー' },
  { value: '#000000', label: '黒' },
  { value: '#ffffff', label: '白' },
];

type OutputProps = {
  output: OutputSettings;
  onChange: (patch: Partial<OutputSettings>) => void;
  support: { webmTransparent: boolean; webm: boolean; mp4: boolean } | null;
  totalSeconds: number;
  estimatedBytes: number;
};

export function OutputControls({ output, onChange, support, totalSeconds, estimatedBytes }: OutputProps) {
  const transparent = output.format === 'webm' && output.background === 'transparent';
  return (
    <div className={styles.stack}>
      <div>
        <p className={styles.label}>形式</p>
        <ChoiceButtons<OutputSettings['format']>
          label="書き出し形式"
          value={output.format}
          onChange={(format) =>
            onChange({ format, background: format === 'mp4' && output.background === 'transparent' ? '#00ff00' : output.background })
          }
          columns={2}
          choices={[
            {
              value: 'webm',
              label: 'WebM',
              sub: support && !support.webm ? '非対応ブラウザ' : support?.webmTransparent === false ? '背景あり' : '背景透過・OBS向け',
              disabled: !!support && !support.webm,
            },
            { value: 'mp4', label: 'MP4', sub: support && !support.mp4 ? '非対応ブラウザ' : 'グリーンバック等', disabled: !!support && !support.mp4 },
          ]}
        />
        {output.format === 'webm' && support && !support.webmTransparent && (
          <p className={styles.note}>このブラウザは透過 WebM を作れません。PC の Chrome / Edge なら背景透過で書き出せます。</p>
        )}
      </div>

      <div>
        <p className={styles.label}>背景</p>
        <div className={styles.backgrounds} role="group" aria-label="背景">
          <button
            type="button"
            className={`${styles.bg} ${styles.bgTransparent}`}
            aria-pressed={output.background === 'transparent'}
            disabled={output.format !== 'webm' || (!!support && !support.webmTransparent)}
            onClick={() => onChange({ background: 'transparent' })}
          >
            透過
          </button>
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.value}
              type="button"
              className={styles.bg}
              style={{ '--swatch': bg.value } as CSSProperties}
              aria-pressed={output.background === bg.value}
              onClick={() => onChange({ background: bg.value })}
            >
              {bg.label}
            </button>
          ))}
        </div>
        <p className={styles.note}>
          {transparent
            ? 'OBS では「メディアソース」で追加すると、絵だけが配信画面に重なります。'
            : 'グリーン / ブルーは、配信ソフトの「クロマキー」で背景を抜いて使えます。'}
        </p>
      </div>

      <div className={styles.twoColumns}>
        <div>
          <p className={styles.label}>サイズ</p>
          <ChoiceButtons<SizePreset>
            label="動画のサイズ"
            value={output.size}
            onChange={(size) => onChange({ size })}
            columns={2}
            choices={[
              { value: '1920x1080', label: '1920×1080', sub: '横・フルHD' },
              { value: '1280x720', label: '1280×720', sub: '横・軽め' },
              { value: '1080x1920', label: '1080×1920', sub: '縦長' },
              { value: '1080x1080', label: '1080×1080', sub: '正方形' },
            ]}
          />
        </div>
        <div className={styles.stackTight}>
          <div>
            <p className={styles.label}>流れ出る時間</p>
            <ChoiceButtons<OutputSettings['seconds']>
              label="流れ出る時間"
              value={output.seconds}
              onChange={(seconds) => onChange({ seconds })}
              columns={4}
              choices={[3, 5, 8, 12].map((s) => ({ value: s as OutputSettings['seconds'], label: `${s}秒` }))}
            />
          </div>
          <div>
            <p className={styles.label}>なめらかさ</p>
            <ChoiceButtons<OutputSettings['fps']>
              label="フレームレート"
              value={output.fps}
              onChange={(fps) => onChange({ fps })}
              columns={2}
              choices={[
                { value: 30, label: '30fps' },
                { value: 60, label: '60fps', sub: 'なめらか・重い' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className={styles.seedRow}>
        <button type="button" className={styles.seed} onClick={() => onChange({ seed: Math.floor(Math.random() * 1e6) + 2 })}>
          🎲 流れ方のパターンを変える
        </button>
        <p className={styles.stats}>
          動画の長さ <b>{totalSeconds.toFixed(1)}秒</b> ・ 推定 <b>{formatBytes(estimatedBytes)}</b>
        </p>
      </div>
    </div>
  );
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
