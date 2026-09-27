// スマホで画面下に固定表示する「Generate」ボタンです。
// 08 Export のボタンが画面に見えているときは、重複しないよう隠れます。
import type { OutputFormat } from '../types';
import styles from './StickyGenerateBar.module.css';
import { SparkleIcon } from './Stickers';

type Props = {
  visible: boolean;
  format: OutputFormat;
  working: boolean;
  progress: number;
  onGenerate: () => void;
};

export function StickyGenerateBar({ visible, format, working, progress, onGenerate }: Props) {
  const percent = Math.round(progress * 100);
  return (
    <div className={`${styles.bar} ${visible ? styles.visible : ''}`} aria-hidden={!visible}>
      <button type="button" className={styles.button} onClick={onGenerate} disabled={working} tabIndex={visible ? 0 : -1}>
        <SparkleIcon size={22} color="var(--yellow)" />
        <span>{working ? `Generating… ${percent}%` : `Generate ${format === 'webm' ? 'WebM' : 'MP4'}`}</span>
      </button>
    </div>
  );
}
