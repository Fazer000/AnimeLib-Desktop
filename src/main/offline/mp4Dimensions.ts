/** Чтение размеров видеодорожки из заголовков MP4. */
import fs from 'fs';

/** Читает размеры без загрузки медиаданных. */
export default function readMp4Dimensions(
  videoPath: string,
): { width: number; height: number } | null {
  const fd = fs.openSync(videoPath, 'r');
  try {
    const length = fs.fstatSync(fd).size;
    let remaining = 10000;
    /** Читает блок файла по смещению. */
    const read = (offset: number, size: number): Buffer => {
      const buffer = Buffer.alloc(size);
      if (fs.readSync(fd, buffer, 0, size, offset) !== size)
        throw new Error('Truncated MP4');
      return buffer;
    };
    type Box = { type: string; body: number; end: number };
    /** Собирает заголовки боксов в заданных границах. */
    const boxes = (start: number, end: number): Box[] => {
      const result: Box[] = [];
      let offset = start;
      while (offset + 8 <= end) {
        remaining -= 1;
        if (remaining < 0) throw new Error('Too many MP4 boxes');
        const header = read(offset, 8);
        let size = header.readUInt32BE(0);
        let headerSize = 8;
        if (size === 1) {
          const extended = read(offset + 8, 8).readBigUInt64BE();
          if (extended > BigInt(Number.MAX_SAFE_INTEGER))
            throw new Error('Invalid MP4 size');
          size = Number(extended);
          headerSize = 16;
        } else if (size === 0) size = end - offset;
        if (size < headerSize || offset + size > end)
          throw new Error('Invalid MP4 box');
        result.push({
          type: header.toString('ascii', 4, 8),
          body: offset + headerSize,
          end: offset + size,
        });
        offset += size;
      }
      return result;
    };
    const moov = boxes(0, length).find((box) => box.type === 'moov');
    if (!moov) return null;
    const tracks = boxes(moov.body, moov.end).filter(
      (box) => box.type === 'trak',
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const track of tracks) {
      const children = boxes(track.body, track.end);
      const mdia = children.find((box) => box.type === 'mdia');
      const tkhd = children.find((box) => box.type === 'tkhd');
      if (mdia && tkhd && tkhd.end - tkhd.body >= 84) {
        const hdlr = boxes(mdia.body, mdia.end).find(
          (box) => box.type === 'hdlr',
        );
        if (
          hdlr &&
          hdlr.end - hdlr.body >= 12 &&
          read(hdlr.body + 8, 4).toString('ascii') === 'vide'
        ) {
          const dimensions = read(tkhd.end - 8, 8);
          const width = dimensions.readUInt16BE(0);
          const height = dimensions.readUInt16BE(4);
          if (width > 0 && height > 0) return { width, height };
        }
      }
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}
