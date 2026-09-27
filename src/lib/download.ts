// できあがったファイルを保存・共有する処理です。

export function makeFileName(extension: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `kira-danmaku-${stamp}.${extension}`;
}

export function downloadBlob(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** スマホの共有メニュー（「画像を保存」やXアプリへ送る）が使えるか */
export function canShareFile(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

export async function shareFile(file: File) {
  try {
    await navigator.share({ files: [file] });
  } catch (error) {
    // ユーザーが共有をキャンセルした場合は何もしない
    if (error instanceof DOMException && error.name === 'AbortError') return;
    throw error;
  }
}
