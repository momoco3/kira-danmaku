// 「Generate」ボタン、進み具合の表示、できあがったファイルの保存・共有です。
import { useMemo } from 'react';
import { canShareFile, downloadBlob, shareFile } from '../lib/download';
import { formatBytes } from '../lib/estimate';
import type { OutputFormat } from '../types';
import styles from './ExportPanel.module.css';
import { SparkleIcon } from './Stickers';

export type ExportResult = {
  blob: Blob;
  url: string;
  fileName: string;
  format: OutputFormat;
  /** 書き出したときの絵と設定（変更されたら古い結果として隠すため） */
  source: unknown;
};

type Props = {
  format: OutputFormat;
  canGenerate: boolean;
  working: boolean;
  progress: number;
  result: ExportResult | null;
  error: string | null;
  onGenerate: () => void;
};

const FORMAT_LABEL: Record<OutputFormat, string> = { webm: 'WebM', mp4: 'MP4' };

export function ExportPanel({ format, canGenerate, working, progress, result, error, onGenerate }: Props) {
  const file = useMemo(
    () => (result ? new File([result.blob], result.fileName, { type: result.blob.type }) : null),
    [result],
  );
  const shareable = file ? canShareFile(file) : false;
  const percent = Math.round(progress * 100);

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.generate} onClick={onGenerate} disabled={!canGenerate || working}>
        <SparkleIcon size={26} color="var(--yellow)" />
        <span>{working ? `Generating… ${percent}%` : `Generate ${FORMAT_LABEL[format]}`}</span>
      </button>
      {!canGenerate && !working && <p className={styles.help}>まずはイラストか文字を入れてください</p>}

      {working && (
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="書き出しの進み具合"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      )}

      <div aria-live="polite">
        {error && (
          <p className={styles.error} role="alert">
            書き出しに失敗しました: {error}
          </p>
        )}

        {result && !working && (
          <div className={styles.result}>
            <div className={styles.resultMedia}>
              <video src={result.url} autoPlay loop muted playsInline controls aria-label={`書き出した${FORMAT_LABEL[result.format]}`} />
            </div>
            <div className={styles.resultInfo}>
              <p className={styles.done}>できました！</p>
              <p className={styles.fileMeta}>
                {result.fileName}
                <br />
                <strong>{formatBytes(result.blob.size)}</strong>
              </p>
              <div className={styles.resultButtons}>
                <button type="button" className={styles.download} onClick={() => downloadBlob(result.url, result.fileName)}>
                  ⬇ Download
                </button>
                {shareable && file && (
                  <button
                    type="button"
                    className={styles.share}
                    onClick={() => shareFile(file).catch(() => alert('共有できませんでした'))}
                  >
                    共有 / 保存
                  </button>
                )}
              </div>
              {shareable && (
                <p className={styles.help}>スマホでは「共有 / 保存」から写真アプリへ保存したり、ほかのアプリへ送れます。</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
