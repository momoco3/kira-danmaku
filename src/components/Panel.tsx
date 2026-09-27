// 各設定エリアの「白いカード＋ステッカー風の見出し」です。
import type { CSSProperties, ReactNode } from 'react';
import styles from './Panel.module.css';

type Props = {
  id: string;
  title: string;
  hint?: string;
  /** 見出しステッカーの色 */
  color?: string;
  icon?: ReactNode;
  /** 見出しの右側に置くボタンなど */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ id, title, hint, color = 'var(--cyan)', icon, actions, children, className }: Props) {
  return (
    <section id={id} className={`${styles.panel} ${className ?? ''}`} aria-labelledby={`${id}-title`}>
      <div className={styles.head}>
        <h2 id={`${id}-title`} className={styles.title} style={{ '--tag': color } as CSSProperties}>
          {icon}
          {title}
        </h2>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
      {hint && <p className={styles.hint}>{hint}</p>}
      {children}
    </section>
  );
}
