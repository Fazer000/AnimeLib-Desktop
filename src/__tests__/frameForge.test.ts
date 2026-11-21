/** Проверки метаданных и качества Frame Forge. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import readFrameForgeMark from '../main/offline/frameForge';
import {
  formatOfflineQuality,
  getOfflineQuality,
  OfflineEpisode,
} from '../constants';

describe('Frame Forge label', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'frame-forge-label-'),
  );
  const video = path.join(directory, 'episode.bin');
  const sidecar = `${video}.frameforge.json`;
  const marker = {
    Version: 1,
    State: 'Enhanced',
    SourceFileName: 'episode.bin',
    EnhancedHash: 'a'.repeat(64),
    EnhancedLength: 4,
  };

  beforeEach(() => {
    fs.rmSync(path.join(directory, '.frameforge'), {
      recursive: true,
      force: true,
    });
    fs.writeFileSync(video, 'test');
    fs.writeFileSync(sidecar, JSON.stringify(marker));
  });
  afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

  it('shows the label for a completed replacement and actual size', () => {
    expect(readFrameForgeMark(video)).toEqual({ enhanced: true, fileSize: 4 });
  });
  it.each(['Prepared', 'Restored'])('ignores %s transactions', (State) => {
    fs.writeFileSync(sidecar, JSON.stringify({ ...marker, State }));
    expect(readFrameForgeMark(video)).toBeNull();
  });
  it('prefers metadata from the service directory over a legacy marker', () => {
    const service = path.join(directory, '.frameforge');
    fs.mkdirSync(service);
    const relocated = path.join(service, 'episode.bin.frameforge.json');
    fs.writeFileSync(
      relocated,
      JSON.stringify({ ...marker, Width: 2560, Height: 1440 }),
    );
    expect(readFrameForgeMark(video)).toMatchObject({
      videoWidth: 2560,
      videoHeight: 1440,
    });

    fs.writeFileSync(
      relocated,
      JSON.stringify({ ...marker, State: 'Prepared' }),
    );
    expect(readFrameForgeMark(video)).toBeNull();
  });
  it('ignores a replaced file with a different size', () => {
    fs.writeFileSync(video, 'different file');
    expect(readFrameForgeMark(video)).toBeNull();
  });
  it('ignores malformed metadata', () => {
    fs.writeFileSync(sidecar, '{invalid');
    expect(readFrameForgeMark(video)).toBeNull();
  });
  it('ignores a marker belonging to another file', () => {
    fs.writeFileSync(
      sidecar,
      JSON.stringify({ ...marker, SourceFileName: 'other.bin' }),
    );
    expect(readFrameForgeMark(video)).toBeNull();
  });
  it('reads new markers with actual dimensions', () => {
    fs.writeFileSync(
      sidecar,
      JSON.stringify({ ...marker, Width: 2560, Height: 1440 }),
    );
    expect(readFrameForgeMark(video)).toMatchObject({
      videoWidth: 2560,
      videoHeight: 1440,
    });
  });
  it('reads video dimensions from legacy MP4 headers, skipping audio tracks and mdat', () => {
    /** Собирает MP4-бокс. */
    const box = (type: string, content: Buffer): Buffer => {
      const header = Buffer.alloc(8);
      header.writeUInt32BE(content.length + 8);
      header.write(type, 4);
      return Buffer.concat([header, content]);
    };
    /** Собирает дорожку MP4. */
    const track = (handler: string, width: number, height: number): Buffer => {
      const tkhd = Buffer.alloc(84);
      tkhd.writeUInt32BE(width * 65536, 76);
      tkhd.writeUInt32BE(height * 65536, 80);
      const hdlr = Buffer.alloc(12);
      hdlr.write(handler, 8);
      return box(
        'trak',
        Buffer.concat([box('tkhd', tkhd), box('mdia', box('hdlr', hdlr))]),
      );
    };
    const bytes = Buffer.concat([
      box('ftyp', Buffer.from('isom0000')),
      box('mdat', Buffer.alloc(1024 * 1024)),
      box(
        'moov',
        Buffer.concat([track('soun', 0, 0), track('vide', 2560, 1440)]),
      ),
    ]);
    fs.writeFileSync(video, bytes);
    fs.writeFileSync(
      sidecar,
      JSON.stringify({ ...marker, EnhancedLength: bytes.length }),
    );
    expect(readFrameForgeMark(video)).toMatchObject({
      videoWidth: 2560,
      videoHeight: 1440,
    });
  });
  it('formats actual quality with FF without changing the original download key', () => {
    const episode = {
      quality: '720p',
      enhanced: true,
      videoHeight: 1440,
    } as OfflineEpisode;
    expect(getOfflineQuality(episode)).toBe('1440p');
    expect(formatOfflineQuality(episode)).toBe('1440p (FF)');
    expect(episode.quality).toBe('720p');
    expect(formatOfflineQuality({ quality: '720p' } as OfflineEpisode)).toBe(
      '720p',
    );
  });
});
