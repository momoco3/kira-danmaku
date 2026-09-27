import styles from './Header.module.css';
import { SparkleIcon, StarIcon } from './Stickers';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logoWrap}>
        <StarIcon className={styles.star} size={30} />
        <h1 className={styles.logo}>
          <span className={styles.logoFrame}>キラ</span>
          <span className={styles.logoBop}>弾幕</span>
        </h1>
        <SparkleIcon className={styles.bolt} size={30} color="var(--yellow)" />
      </div>
      <p className={styles.tagline}>
        <SparkleIcon size={18} />
        イラストがドバッと流れる、配信用の弾幕動画
      </p>
      <p className={styles.privacy}>
        <span className={styles.lock} aria-hidden="true">
          🔒
        </span>
        画像はブラウザ内だけで処理され、サーバーにアップロードされません
      </p>
    </header>
  );
}
