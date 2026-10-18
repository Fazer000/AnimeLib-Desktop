import {
  Mp4Keyframe,
  findKeyframeForCell,
  parseMp4Index,
  readBoxHeader,
} from '../renderer/utils/mp4Index';

const u32 = (value: number): number[] => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return Array.from(bytes);
};
const u16 = (value: number): number[] => {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value);
  return Array.from(bytes);
};
const ascii = (text: string): number[] =>
  [...text].map((char) => char.charCodeAt(0));

const box = (type: string, ...parts: number[][]): number[] => {
  const body = parts.flat();
  return [...u32(body.length + 8), ...ascii(type), ...body];
};

const full = (...parts: number[][]): number[] => [0, 0, 0, 0, ...parts.flat()];

const hdlr = (kind: string) =>
  box('hdlr', full(u32(0), ascii(kind), new Array(12).fill(0), [0]));

const mdhd = (timescale: number) =>
  box('mdhd', full(u32(0), u32(0), u32(timescale), u32(0), u32(0)));

const VISUAL_REST = 78 - 28;

const avcC = box('avcC', [1, 0x4d, 0x40, 0x1f, 0xff, 0xe0, 0]);

const sampleEntry = (type: string, width: number, height: number) =>
  box(
    type,
    new Array(6).fill(0),
    u16(1),
    new Array(16).fill(0),
    u16(width),
    u16(height),
    new Array(VISUAL_REST).fill(0),
    avcC,
  );

interface TrackOptions {
  entry?: string;
  co64?: boolean;
  sync?: number[] | null;
}

/**
 * 6 образцов по 1 с (timescale 1000): куски по 2, 2 и 2 образца,
 * размеры 10…60, куски начинаются с 1000, 2000 и 3000
 */
const videoTrak = ({
  entry = 'avc1',
  co64 = false,
  sync = [1, 4],
}: TrackOptions) =>
  box(
    'trak',
    box(
      'mdia',
      mdhd(1000),
      hdlr('vide'),
      box(
        'minf',
        box(
          'stbl',
          box('stsd', full(u32(1)), sampleEntry(entry, 640, 360)),
          box('stts', full(u32(1), u32(6), u32(1000))),
          ...(sync
            ? [box('stss', full(u32(sync.length), ...sync.map(u32)))]
            : []),
          box(
            'stsz',
            full(u32(0), u32(6), ...[10, 20, 30, 40, 50, 60].map(u32)),
          ),
          box('stsc', full(u32(1), u32(1), u32(2), u32(1))),
          co64
            ? box(
                'co64',
                full(
                  u32(3),
                  [1000, 2000, 3000].flatMap((o) => [...u32(0), ...u32(o)]),
                ),
              )
            : box('stco', full(u32(3), ...[1000, 2000, 3000].map(u32))),
        ),
      ),
    ),
  );

const soundTrak = box('trak', box('mdia', mdhd(48000), hdlr('soun')));

const moov = (options: TrackOptions = {}) =>
  new Uint8Array(box('moov', soundTrak, videoTrak(options)));

describe('readBoxHeader', () => {
  it('читает размер и тип', () => {
    expect(readBoxHeader(new Uint8Array(box('ftyp', [1, 2, 3])))).toEqual({
      type: 'ftyp',
      size: 11,
      headerSize: 8,
    });
  });

  it('понимает 64-битный размер и «до конца файла»', () => {
    const large = new Uint8Array([
      ...u32(1),
      ...ascii('mdat'),
      ...u32(1),
      ...u32(16),
    ]);
    expect(readBoxHeader(large)).toEqual({
      type: 'mdat',
      size: 2 ** 32 + 16,
      headerSize: 16,
    });
    expect(
      readBoxHeader(new Uint8Array([...u32(0), ...ascii('mdat')]))?.size,
    ).toBe(Infinity);
  });

  it('на неполных данных отдаёт null', () => {
    expect(readBoxHeader(new Uint8Array([0, 0, 0]))).toBeNull();
  });
});

describe('parseMp4Index', () => {
  it('находит видеодорожку и её опорные кадры', () => {
    const index = parseMp4Index(moov());

    expect(index).not.toBeNull();
    expect(index?.codec).toBe('avc1.4d401f');
    expect([index?.width, index?.height]).toEqual([640, 360]);
    expect(index?.keyframes).toEqual([
      { time: 0, offset: 1000, size: 10 },
      { time: 3, offset: 2030, size: 40 },
    ]);
  });

  it('отдаёт тело avcC как описание для декодера', () => {
    expect(Array.from(parseMp4Index(moov())?.description || [])).toEqual([
      1, 0x4d, 0x40, 0x1f, 0xff, 0xe0, 0,
    ]);
  });

  it('понимает 64-битные смещения кусков', () => {
    expect(parseMp4Index(moov({ co64: true }))?.keyframes[1].offset).toBe(2030);
  });

  it('без таблицы stss все кадры опорные', () => {
    expect(parseMp4Index(moov({ sync: null }))?.keyframes).toHaveLength(6);
  });

  it('видео не в H.264 не поддерживается', () => {
    expect(parseMp4Index(moov({ entry: 'hev1' }))).toBeNull();
  });

  it('не moov или без видео — null', () => {
    expect(parseMp4Index(new Uint8Array(box('free', [0])))).toBeNull();
    expect(parseMp4Index(new Uint8Array(box('moov', soundTrak)))).toBeNull();
  });
});

describe('findKeyframeForCell', () => {
  const keys: Mp4Keyframe[] = [0, 3, 6.5, 12].map((time) => ({
    time,
    offset: time,
    size: 1,
  }));

  it('берёт первый опорный кадр внутри ячейки', () => {
    expect(findKeyframeForCell(keys, 5, 10)?.time).toBe(6.5);
    expect(findKeyframeForCell(keys, 0, 5)?.time).toBe(0);
  });

  it('если в ячейке опорных кадров нет — последний перед ней', () => {
    expect(findKeyframeForCell(keys, 8, 10)?.time).toBe(6.5);
    expect(findKeyframeForCell(keys, 20, 25)?.time).toBe(12);
  });

  it('без кадров — null', () => {
    expect(findKeyframeForCell([], 0, 5)).toBeNull();
  });
});
