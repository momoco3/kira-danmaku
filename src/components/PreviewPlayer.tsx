// リアルタイムプレビュー。書き出しと同じ台本（scene）と描画（renderFrame）を使います。
// 下のグラフは「いつ、どれくらい流れるか」。ドラッグで好きな時刻を見られます。
import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob, makeFileName } from '../lib/download';
import { makeCanvas, prepareAssets, prepareBackground, renderFrame, type TextSources } from '../lib/renderer';
import type { Scene } from '../lib/scene';
import type { Illustration, Settings } from '../types';
import styles from './PreviewPlayer.module.css';
import { PauseIcon, PlayIcon, RestartIcon } from './Stickers';

type Props = {
  scene: Scene;
  images: Illustration[];
  /** 文字の画像（文字を出さないときは null） */
  textSources: TextSources | null;
  settings: Settings;
  backgroundImage: Illustration | null;
};

const PREVIEW_LONG_SIDE = 960;

export function PreviewPlayer({ scene, images, textSources, settings, backgroundImage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);

  const scale = Math.min(1, PREVIEW_LONG_SIDE / Math.max(scene.width, scene.height));
  const width = Math.round(scene.width * scale);
  const height = Math.round(scene.height * scale);
  const pixelRatio = scale * Math.min(2, window.devicePixelRatio || 1);
  const spriteHeight = scene.height * settings.flow.sizeMax * pixelRatio;
  const textHeight = scene.phraseHeight * pixelRatio;
  const assets = useMemo(
    () => ({
      ...prepareAssets(images, spriteHeight, { sources: textSources, phraseHeight: textHeight }),
      background: prepareBackground(backgroundImage, width, height),
    }),
    [images, spriteHeight, textSources, textHeight, backgroundImage, width, height],
  );

  const draw = (t: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    renderFrame(ctx, scene, t, assets, settings);
  };

  // 再生ループ
  useEffect(() => {
    if (!playing) {
      draw(timeRef.current);
      return;
    }
    let rafId = 0;
    let last = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      timeRef.current = (timeRef.current + (now - last) / 1000) % scene.totalSeconds;
      last = now;
      draw(timeRef.current);
      // 時刻の表示は少し間引いて更新
      if (now - lastUi > 100) {
        lastUi = now;
        setTime(timeRef.current);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // draw は毎回作り直されるので依存に入れない（scene / assets / settings が変われば再開される）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, scene, assets, settings, scale]);

  // 今見えている瞬間を、書き出しと同じ大きさ（1920×1080 など）の PNG で保存する
  const [saving, setSaving] = useState(false);
  const saveImage = async () => {
    if (saving) return;
    setSaving(true);
    setPlaying(false);
    try {
      const t = timeRef.current;
      const canvas = makeCanvas(scene.width, scene.height);
      const full = {
        ...prepareAssets(images, scene.height * settings.flow.sizeMax, { sources: textSources, phraseHeight: scene.phraseHeight }),
        background: prepareBackground(backgroundImage, scene.width, scene.height),
      };
      renderFrame(canvas.getContext('2d')!, scene, t, full, settings);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('画像を作れませんでした');
      const url = URL.createObjectURL(blob);
      downloadBlob(url, makeFileName('png').replace('.png', `-${t.toFixed(1)}s.png`));
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setSaving(false);
    }
  };

  const seek = (t: number) => {
    timeRef.current = t;
    setTime(t);
    if (!playing) draw(t);
  };

  // 量のグラフ（SVG のパス）
  const graph = useMemo(() => {
    const steps = 80;
    const points: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * scene.totalSeconds;
      const x = (i / steps) * 100;
      const y = 28 - scene.envelope(t) * 26;
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return `M0,28 L${points.join(' L')} L100,28 Z`;
  }, [scene]);

  if (images.length === 0 && !textSources) {
    return (
      <div className={styles.empty}>
        <p>イラストか文字を入れると、ここで流れ方を確認できます</p>
      </div>
    );
  }

  return (
    <div className={styles.player}>
      <div className={`${styles.stage} ${settings.output.background === 'transparent' ? styles.checker : ''}`}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width={width}
          height={height}
          style={{ aspectRatio: `${width} / ${height}` }}
          role="img"
          aria-label="弾幕のプレビュー"
        />
      </div>

      <div className={styles.timeline}>
        <svg className={styles.graph} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
          <path d={graph} />
        </svg>
        <div className={styles.playhead} style={{ left: `${(time / scene.totalSeconds) * 100}%` }} />
        <input
          type="range"
          className={styles.scrub}
          min={0}
          max={scene.totalSeconds}
          step={0.01}
          value={time}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="再生位置"
        />
      </div>

      <div className={styles.bar}>
        <button type="button" className={`${styles.control} ${styles.play}`} onClick={() => setPlaying((v) => !v)} aria-label={playing ? '一時停止' : '再生'}>
          {playing ? <PauseIcon /> : <PlayIcon />}
          <span>{playing ? 'Pause' : 'Play'}</span>
        </button>
        <button
          type="button"
          className={styles.control}
          onClick={() => {
            seek(0);
            setPlaying(true);
          }}
          aria-label="最初から"
        >
          <RestartIcon />
          <span>最初から</span>
        </button>
        <button type="button" className={styles.control} onClick={saveImage} disabled={saving} title="今の瞬間を動画と同じ大きさの PNG で保存（背景が透過なら透明のまま）">
          <span aria-hidden="true">📷</span>
          <span>{saving ? '保存中…' : '画像で保存'}</span>
        </button>
        <p className={styles.info}>
          {time.toFixed(1)} / {scene.totalSeconds.toFixed(1)} 秒 ・ 絵・文字 {scene.sprites.length} 個
        </p>
      </div>
    </div>
  );
}
