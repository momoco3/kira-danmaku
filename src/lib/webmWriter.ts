// WebM ファイルを組み立てる小さな自作ライブラリです（VP9 の映像1本だけ）。
//
// 背景透過の WebM は「色の映像」と「透明度だけの映像（白黒）」の2本を作り、
// 透明度のほうを各コマの BlockAdditions に入れる、という決まりになっています。
// ブラウザ標準の WebCodecs は透過つきで直接エンコードできないことが多いので、
// 2本に分けてエンコードし、ここで1つのファイルにまとめます。Chrome や OBS でそのまま透過再生できます。
// 仕様: https://www.matroska.org/technical/elements.html

export type WebmFrame = {
  /** 時刻（マイクロ秒） */
  timestamp: number;
  key: boolean;
  data: Uint8Array;
  /** 透明度の映像（あれば） */
  alpha?: Uint8Array;
};

type Element = { id: number; data: Uint8Array | Element[] };

export function writeWebm(options: { width: number; height: number; durationMs: number; frames: WebmFrame[]; alpha: boolean }): Blob {
  const { width, height, durationMs, frames, alpha } = options;

  const header: Element = {
    id: 0x1a45dfa3,
    data: [
      uint(0x4286, 1), // EBMLVersion
      uint(0x42f7, 1), // EBMLReadVersion
      uint(0x42f2, 4), // EBMLMaxIDLength
      uint(0x42f3, 8), // EBMLMaxSizeLength
      str(0x4282, 'webm'), // DocType
      uint(0x4287, 4), // DocTypeVersion（BlockAdditions を使うので 4）
      uint(0x4285, 2), // DocTypeReadVersion
    ],
  };

  const info: Element = {
    id: 0x1549a966,
    data: [uint(0x2ad7b1, 1_000_000), str(0x4d80, 'KiraDanmaku'), str(0x5741, 'KiraDanmaku'), float64(0x4489, durationMs)],
  };

  const video: Element = { id: 0xe0, data: [uint(0xb0, width), uint(0xba, height), ...(alpha ? [uint(0x53c0, 1)] : [])] };
  const tracks: Element = {
    id: 0x1654ae6b,
    data: [
      {
        id: 0xae, // TrackEntry
        data: [
          uint(0xd7, 1), // TrackNumber
          uint(0x73c5, 1), // TrackUID
          uint(0x83, 1), // TrackType: video
          uint(0x9c, 0), // FlagLacing
          str(0x86, 'V_VP9'),
          ...(alpha ? [uint(0x55ee, 1)] : []), // MaxBlockAdditionID
          video,
        ],
      },
    ],
  };

  // キーフレームごとにクラスタ（まとまり）を分ける
  const clusters: Element[] = [];
  let cluster: Element | null = null;
  let clusterTime = 0;
  let previousTime = 0;
  for (const frame of frames) {
    const timeMs = Math.round(frame.timestamp / 1000);
    if (!cluster || frame.key || timeMs - clusterTime > 30000) {
      clusterTime = timeMs;
      cluster = { id: 0x1f43b675, data: [uint(0xe7, clusterTime)] };
      clusters.push(cluster);
    }
    const relative = timeMs - clusterTime;
    const blockHeader = new Uint8Array(4);
    blockHeader[0] = 0x81; // track number 1
    new DataView(blockHeader.buffer).setInt16(1, relative);
    blockHeader[3] = 0;
    const group: Element[] = [bin(0xa1, concat([blockHeader, frame.data]))];
    if (!frame.key) group.push(int(0xfb, previousTime - timeMs)); // ReferenceBlock（前のコマを参照）
    if (frame.alpha) {
      group.push({
        id: 0x75a1, // BlockAdditions
        data: [{ id: 0xa6, data: [uint(0xee, 1), bin(0xa5, frame.alpha)] }], // BlockMore / BlockAddID / BlockAdditional
      });
    }
    (cluster.data as Element[]).push({ id: 0xa0, data: group }); // BlockGroup
    previousTime = timeMs;
  }

  const segment: Element = { id: 0x18538067, data: [info, tracks, ...clusters] };
  return new Blob([encode(header), encode(segment)] as BlobPart[], { type: 'video/webm' });
}

// ---- EBML の書き方 ----

function encode(element: Element): Uint8Array {
  const body = element.data instanceof Uint8Array ? element.data : concat(element.data.map(encode));
  return concat([idBytes(element.id), sizeBytes(body.length), body]);
}

function idBytes(id: number): Uint8Array {
  const bytes: number[] = [];
  let v = id;
  while (v > 0) {
    bytes.unshift(v & 0xff);
    v = Math.floor(v / 256);
  }
  return new Uint8Array(bytes);
}

/** 長さはいつも 8 バイトで書く（シンプルさ優先） */
function sizeBytes(size: number): Uint8Array {
  const out = new Uint8Array(8);
  out[0] = 0x01;
  let v = size;
  for (let i = 7; i >= 1; i--) {
    out[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  return out;
}

function uint(id: number, value: number): Element {
  const bytes: number[] = [];
  let v = value;
  do {
    bytes.unshift(v & 0xff);
    v = Math.floor(v / 256);
  } while (v > 0);
  return { id, data: new Uint8Array(bytes) };
}

function int(id: number, value: number): Element {
  const data = new Uint8Array(2);
  new DataView(data.buffer).setInt16(0, value);
  return { id, data };
}

function float64(id: number, value: number): Element {
  const data = new Uint8Array(8);
  new DataView(data.buffer).setFloat64(0, value);
  return { id, data };
}

function str(id: number, value: string): Element {
  return { id, data: new TextEncoder().encode(value) };
}

function bin(id: number, data: Uint8Array): Element {
  return { id, data };
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
