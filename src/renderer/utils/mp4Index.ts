/** Разбор индекса MP4 (moov): где в файле лежат опорные кадры видеодорожки и чем их декодировать */

export interface Mp4Keyframe {
  time: number;
  offset: number;
  size: number;
}

export interface Mp4VideoIndex {
  codec: string;
  description: Uint8Array;
  width: number;
  height: number;
  keyframes: Mp4Keyframe[];
}

export interface BoxHeader {
  type: string;
  size: number;
  headerSize: number;
}

interface Box {
  type: string;
  start: number;
  end: number;
}

const VISUAL_SAMPLE_ENTRY_SIZE = 78;

const AVC_ENTRIES = ['avc1', 'avc3'];

const u32 = (view: DataView, offset: number): number => view.getUint32(offset);

const u64 = (view: DataView, offset: number): number =>
  view.getUint32(offset) * 2 ** 32 + view.getUint32(offset + 4);

const typeAt = (bytes: Uint8Array, offset: number): string =>
  String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );

const hex = (value: number): string => value.toString(16).padStart(2, '0');

/** Заголовок бокса верхнего уровня; null — данных меньше заголовка */
export function readBoxHeader(bytes: Uint8Array, offset = 0): BoxHeader | null {
  if (bytes.length < offset + 8) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = u32(view, offset);
  const type = typeAt(bytes, offset + 4);

  if (size === 1) {
    if (bytes.length < offset + 16) return null;
    return { type, size: u64(view, offset + 8), headerSize: 16 };
  }

  return { type, size: size === 0 ? Infinity : size, headerSize: 8 };
}

/**
 * Дочерние боксы в границах [start, end)
 */
function children(bytes: Uint8Array, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;

  while (offset + 8 <= end) {
    const header = readBoxHeader(bytes, offset);
    if (!header) break;

    const size = Number.isFinite(header.size) ? header.size : end - offset;
    if (size < header.headerSize) break;

    boxes.push({
      type: header.type,
      start: offset + header.headerSize,
      end: Math.min(offset + size, end),
    });
    offset += size;
  }

  return boxes;
}

const child = (bytes: Uint8Array, parent: Box, type: string): Box | null =>
  children(bytes, parent.start, parent.end).find((box) => box.type === type) ||
  null;

const path = (bytes: Uint8Array, parent: Box, types: string[]): Box | null =>
  types.reduce<Box | null>(
    (box, type) => (box ? child(bytes, box, type) : null),
    parent,
  );

/**
 * Смещения и размеры всех образцов по таблицам stsc, stco/co64 и stsz
 */
function sampleLayout(
  bytes: Uint8Array,
  view: DataView,
  stbl: Box,
): { offsets: number[]; sizes: number[] } | null {
  const stsz = child(bytes, stbl, 'stsz');
  const stsc = child(bytes, stbl, 'stsc');
  const stco = child(bytes, stbl, 'stco') || child(bytes, stbl, 'co64');
  if (!stsz || !stsc || !stco) return null;

  const fixedSize = u32(view, stsz.start + 4);
  const count = u32(view, stsz.start + 8);
  const sizes = Array.from(
    { length: count },
    (_, i) => fixedSize || u32(view, stsz.start + 12 + i * 4),
  );

  const runs = Array.from({ length: u32(view, stsc.start + 4) }, (_, i) => ({
    firstChunk: u32(view, stsc.start + 8 + i * 12),
    perChunk: u32(view, stsc.start + 12 + i * 12),
  }));

  const isCo64 = stco.type === 'co64';
  const chunks = u32(view, stco.start + 4);
  const offsets: number[] = [];
  let sample = 0;
  let run = 0;

  for (let chunk = 0; chunk < chunks && sample < count; chunk += 1) {
    while (run + 1 < runs.length && runs[run + 1].firstChunk <= chunk + 1) {
      run += 1;
    }

    let offset = isCo64
      ? u64(view, stco.start + 8 + chunk * 8)
      : u32(view, stco.start + 8 + chunk * 4);

    for (let i = 0; i < (runs[run]?.perChunk ?? 0) && sample < count; i += 1) {
      offsets.push(offset);
      offset += sizes[sample];
      sample += 1;
    }
  }

  return { offsets, sizes };
}

/**
 * Время декодирования каждого образца по stts, в единицах дорожки
 */
function sampleTimes(view: DataView, stts: Box, count: number): number[] {
  const times: number[] = [];
  const entries = u32(view, stts.start + 4);
  let time = 0;

  for (let i = 0; i < entries && times.length < count; i += 1) {
    const repeat = u32(view, stts.start + 8 + i * 8);
    const delta = u32(view, stts.start + 12 + i * 8);

    for (let j = 0; j < repeat && times.length < count; j += 1) {
      times.push(time);
      time += delta;
    }
  }

  return times;
}

/** Индекс видеодорожки H.264 из бокса moov */
export function parseMp4Index(moov: Uint8Array): Mp4VideoIndex | null {
  const view = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
  const header = readBoxHeader(moov);
  if (!header || header.type !== 'moov') return null;

  const root: Box = {
    type: 'moov',
    start: header.headerSize,
    end: Math.min(header.size, moov.length),
  };

  const trak = children(moov, root.start, root.end)
    .filter((box) => box.type === 'trak')
    .find((box) => {
      const hdlr = path(moov, box, ['mdia', 'hdlr']);
      return hdlr ? typeAt(moov, hdlr.start + 8) === 'vide' : false;
    });
  if (!trak) return null;

  const mdhd = path(moov, trak, ['mdia', 'mdhd']);
  const stbl = path(moov, trak, ['mdia', 'minf', 'stbl']);
  const stsd = stbl && child(moov, stbl, 'stsd');
  const stts = stbl && child(moov, stbl, 'stts');
  if (!mdhd || !stbl || !stsd || !stts) return null;

  const timescale =
    moov[mdhd.start] === 1
      ? u32(view, mdhd.start + 20)
      : u32(view, mdhd.start + 12);

  const [entry] = children(moov, stsd.start + 8, stsd.end);
  if (!entry || !AVC_ENTRIES.includes(entry.type)) return null;

  const avcC = children(
    moov,
    entry.start + VISUAL_SAMPLE_ENTRY_SIZE,
    entry.end,
  ).find((box) => box.type === 'avcC');
  if (!avcC || !timescale) return null;

  const description = moov.slice(avcC.start, avcC.end);
  const layout = sampleLayout(moov, view, stbl);
  if (!layout) return null;

  const times = sampleTimes(view, stts, layout.sizes.length);
  const stss = child(moov, stbl, 'stss');
  const syncSamples = stss
    ? Array.from(
        { length: u32(view, stss.start + 4) },
        (_, i) => u32(view, stss.start + 8 + i * 4) - 1,
      )
    : layout.sizes.map((_, i) => i);

  const keyframes = syncSamples
    .filter((sample) => sample < layout.offsets.length)
    .map((sample) => ({
      time: times[sample] / timescale,
      offset: layout.offsets[sample],
      size: layout.sizes[sample],
    }))
    .sort((a, b) => a.time - b.time);

  return {
    codec: `${entry.type}.${hex(description[1])}${hex(description[2])}${hex(description[3])}`,
    description,
    width: view.getUint16(entry.start + 24),
    height: view.getUint16(entry.start + 26),
    keyframes,
  };
}

/** Опорный кадр для ячейки превью */
export function findKeyframeForCell(
  keyframes: Mp4Keyframe[],
  start: number,
  end: number,
): Mp4Keyframe | null {
  let lo = 0;
  let hi = keyframes.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (keyframes[mid].time < start) lo = mid + 1;
    else hi = mid;
  }

  if (lo < keyframes.length && keyframes[lo].time < end) {
    return keyframes[lo];
  }

  return lo > 0 ? keyframes[lo - 1] : null;
}
