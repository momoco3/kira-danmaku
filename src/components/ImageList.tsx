// 流すイラストを入れるエリア。何枚でも入れられて、ランダムに混ぜて流れます。
import { useRef, useState, type DragEvent } from 'react';
import { ACCEPT_ATTRIBUTE } from '../lib/loadImages';
import type { Illustration } from '../types';
import styles from './ImageList.module.css';
import { CloseIcon, PlusIcon } from './Stickers';

type Props = {
  images: Illustration[];
  loading: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
};

export function ImageList({ images, loading, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onAdd(files);
  };

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <ul className={styles.grid} aria-label="流すイラスト">
        {images.map((image) => (
          <li key={image.id} className={styles.item}>
            <img src={image.url} alt={image.name} />
            <button type="button" className={styles.remove} onClick={() => onRemove(image.id)} aria-label={`${image.name} を外す`}>
              <CloseIcon size={14} />
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={styles.add} onClick={() => inputRef.current?.click()} disabled={loading}>
            <span className={styles.plus}>
              <PlusIcon size={22} />
            </span>
            <span>{loading ? '読み込み中…' : images.length ? '追加' : 'イラストを選ぶ'}</span>
          </button>
        </li>
      </ul>
      <p className={styles.hint}>
        透明背景の PNG / WebP がおすすめ。何枚でも入れられて、ランダムに混ざって流れます。
        <span className={styles.desktopOnly}>（ここにドラッグ＆ドロップもできます）</span>
      </p>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onAdd(files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
