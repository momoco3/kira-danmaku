// 飾り用の小さなSVGアイコン（星・稲妻・矢印など）と背景のスプラッシュです。
// すべて装飾なので、スクリーンリーダーには読ませません（aria-hidden）。
import type { CSSProperties } from 'react';
import styles from './Stickers.module.css';

type IconProps = { size?: number; color?: string; className?: string; style?: CSSProperties };

export function StarIcon({ size = 24, color = 'var(--yellow)', className, style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 1.8l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.4 1.4-6.8L2.2 8.9l6.9-.8z"
        fill={color}
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BoltIcon({ size = 24, color = 'var(--yellow)', className, style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M13.5 1.5L4 13.5h6.5L9 22.5l10-12.5h-6.6z"
        fill={color}
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkleIcon({ size = 24, color = 'var(--cyan)', className, style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 1.5c.9 5.6 3.2 8.4 9 10.5-5.8 2.1-8.1 4.9-9 10.5-.9-5.6-3.2-8.4-9-10.5 5.8-2.1 8.1-4.9 9-10.5z"
        fill={color}
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowIcon({ size = 24, className, style, direction = 'right' }: IconProps & { direction?: 'left' | 'right' }) {
  return (
    <svg
      className={className}
      style={{ transform: direction === 'left' ? 'scaleX(-1)' : undefined, ...style }}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export function PlayIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function PauseIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function RestartIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M4 3.5v5h5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 画面の四隅にうっすら置くカラフルなスプラッシュ */
export function BackgroundSplashes() {
  return (
    <div className={styles.splashes} aria-hidden="true">
      <svg className={`${styles.splash} ${styles.topLeft}`} viewBox="0 0 200 200">
        <path
          d="M40 30c30-25 70-10 95 5s55 5 50 45-35 45-30 75-40 45-70 25-45-5-65-40S10 55 40 30z"
          fill="var(--cyan)"
        />
        <circle cx="170" cy="30" r="9" fill="var(--pink)" />
        <circle cx="185" cy="60" r="5" fill="var(--sky)" />
      </svg>
      <svg className={`${styles.splash} ${styles.topRight}`} viewBox="0 0 200 200">
        <path
          d="M60 20c35-15 60 20 90 15s50 30 35 60-5 55-40 70-50-15-80-5-50-25-40-60 0-65 35-80z"
          fill="var(--pink)"
        />
        <circle cx="25" cy="170" r="10" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" />
      </svg>
      <svg className={`${styles.splash} ${styles.bottomLeft}`} viewBox="0 0 200 200">
        <path
          d="M30 70c20-40 70-50 100-30s60 35 45 75-50 60-90 55-70-60-55-100z"
          fill="var(--yellow)"
        />
        <circle cx="180" cy="40" r="8" fill="var(--lime)" />
      </svg>
      <svg className={`${styles.splash} ${styles.bottomRight}`} viewBox="0 0 200 200">
        <path
          d="M70 30c40-20 80 10 95 45s-5 80-40 95-75 0-95-35-5-85 40-105z"
          fill="var(--lime)"
        />
        <path d="M20 40l20 6-14 14z" fill="var(--purple)" />
      </svg>
      <StarIcon className={styles.floatStar} size={34} />
      <BoltIcon className={styles.floatBolt} size={40} color="var(--pink)" />
      <SparkleIcon className={styles.floatSparkle} size={30} />
    </div>
  );
}
