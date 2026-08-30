import { parsePlaylist } from '../main/offline/HlsDownloader';

const BASE = 'https://cdn.example.com/video/index.m3u8';

describe('parsePlaylist', () => {
  it('собирает сегменты с длительностями и абсолютными ссылками', () => {
    const info = parsePlaylist(
      [
        '#EXTM3U',
        '#EXT-X-TARGETDURATION:10',
        '#EXTINF:9.009,',
        'seg0.ts',
        '#EXTINF:8.500,',
        'sub/seg1.ts',
        '#EXT-X-ENDLIST',
      ].join('\n'),
      BASE,
    );

    expect(info.segments).toHaveLength(2);
    expect(info.segments[0]).toMatchObject({
      url: 'https://cdn.example.com/video/seg0.ts',
      duration: 9.009,
    });
    expect(info.segments[1].url).toBe(
      'https://cdn.example.com/video/sub/seg1.ts',
    );
    expect(info.segments[1].duration).toBe(8.5);
  });

  it('абсолютные ссылки в плейлисте не переписываются', () => {
    const info = parsePlaylist(
      ['#EXTINF:5,', 'https://other.example.com/a.ts'].join('\n'),
      BASE,
    );

    expect(info.segments[0].url).toBe('https://other.example.com/a.ts');
  });

  it('помечает разрыв нумерации у следующего сегмента', () => {
    const info = parsePlaylist(
      ['#EXTINF:5,', 'a.ts', '#EXT-X-DISCONTINUITY', '#EXTINF:5,', 'b.ts'].join(
        '\n',
      ),
      BASE,
    );

    expect(info.segments[0].discontinuity).toBe(false);
    expect(info.segments[1].discontinuity).toBe(true);
  });

  it('распознаёт шифрованный поток', () => {
    const encrypted = parsePlaylist(
      ['#EXT-X-KEY:METHOD=AES-128,URI="key"', '#EXTINF:5,', 'a.ts'].join('\n'),
      BASE,
    );
    const plain = parsePlaylist(
      ['#EXT-X-KEY:METHOD=NONE', '#EXTINF:5,', 'a.ts'].join('\n'),
      BASE,
    );

    expect(encrypted.encrypted).toBe(true);
    expect(plain.encrypted).toBe(false);
  });

  it('читает инициализационный сегмент из EXT-X-MAP', () => {
    const info = parsePlaylist(
      [
        '#EXT-X-MAP:URI="init.mp4",BYTERANGE="800@0"',
        '#EXTINF:5,',
        'a.m4s',
      ].join('\n'),
      BASE,
    );

    expect(info.initUrl).toBe('https://cdn.example.com/video/init.mp4');
    expect(info.initRangeHeader).toBe('bytes=0-799');
  });

  it('раскрывает byte-range с неявным смещением', () => {
    const info = parsePlaylist(
      [
        '#EXT-X-BYTERANGE:100@0',
        '#EXTINF:5,',
        'all.ts',
        '#EXT-X-BYTERANGE:50',
        '#EXTINF:5,',
        'all.ts',
      ].join('\n'),
      BASE,
    );

    expect(info.segments[0].rangeHeader).toBe('bytes=0-99');
    expect(info.segments[1].rangeHeader).toBe('bytes=100-149');
  });

  it('пустой плейлист даёт пустой список без падения', () => {
    const info = parsePlaylist('#EXTM3U\n#EXT-X-ENDLIST', BASE);

    expect(info.segments).toEqual([]);
    expect(info.encrypted).toBe(false);
  });

  it('переносы CRLF и лишние пробелы не мешают', () => {
    const info = parsePlaylist('#EXTINF:5,\r\n  a.ts  \r\n', BASE);

    expect(info.segments).toHaveLength(1);
    expect(info.segments[0].url).toBe('https://cdn.example.com/video/a.ts');
  });
});
