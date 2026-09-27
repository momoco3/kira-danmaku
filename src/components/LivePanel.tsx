// 生配信モード: OBS のブラウザソースで読み込む HTML をダウンロードするエリアです。
import { useState } from 'react';
import { downloadBlob } from '../lib/download';
import { buildLiveHtml } from '../lib/liveHtml';
import type { Illustration, Settings } from '../types';
import styles from './LivePanel.module.css';

type Props = { images: Illustration[]; settings: Settings };

export function LivePanel({ images, settings }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const make = async (open: boolean) => {
    if (!images.length || busy) return;
    setBusy(true);
    setError(null);
    // ポップアップがブロックされないよう、先にウィンドウを開いておく
    const win = open ? window.open('', '_blank') : null;
    try {
      const html = await buildLiveHtml(images, settings);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (win) win.location.href = url;
      else downloadBlob(url, 'kira-danmaku-live.html');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      win?.close();
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.lead}>
        動画を作らずに、<b>配信中にその場で弾幕を流す</b>モードです。今のイラストと設定を1つの HTML ファイルにまとめてダウンロードし、
        OBS の「ブラウザソース」で読み込みます。流れ方は毎回変わり、続けて出すと弾幕が重なります。
      </p>
      <div className={styles.buttons}>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!images.length || busy} onClick={() => make(false)}>
          ⬇ 生配信用ファイル（HTML）をダウンロード
        </button>
        <button type="button" className={styles.button} disabled={!images.length || busy} onClick={() => make(true)}>
          このブラウザで試す
        </button>
      </div>
      {!images.length && <p className={styles.note}>まずはイラストを入れてください。</p>}
      {error && (
        <p className={styles.error} role="alert">
          作れませんでした: {error}
        </p>
      )}

      <ol className={styles.steps}>
        <li>OBS の「ソース」の＋から <b>ブラウザ</b> を追加</li>
        <li>
          <b>ローカルファイル</b> にチェックを入れて、ダウンロードした <code>kira-danmaku-live.html</code> を選ぶ
        </li>
        <li>
          幅・高さを配信画面と同じにする（例: <b>1920 × 1080</b>）
        </li>
        <li>
          ソースを<b>表示するたびに</b>弾幕が流れます。「表示 / 非表示」にホットキーを割り当てておくと、叫んだ瞬間にキー1つで流せます
        </li>
      </ol>
      <p className={styles.note}>
        設定やイラストを変えたときは、もう一度ダウンロードして OBS のファイルを差し替えてください。
        「このブラウザで試す」では、クリックかスペースキーで流れます。
      </p>
    </div>
  );
}
