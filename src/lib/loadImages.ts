// 選択・ドロップされた画像ファイルを読み込みます。
// 画像はブラウザの中だけで扱い、どこにもアップロードしません。
import type { Illustration } from '../types';

export const ACCEPT_ATTRIBUTE = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

export function isSupportedImage(file: File): boolean {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
}

export async function loadIllustration(file: File): Promise<Illustration> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    // decode() はタブが裏にあると終わらないことがあるため、load イベントで待ちます
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`読み込めませんでした: ${file.name}`));
      image.src = url;
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return { id, name: file.name, url, width: image.naturalWidth, height: image.naturalHeight, image };
}

export function releaseImage(image: Illustration | null) {
  if (image) URL.revokeObjectURL(image.url);
}
