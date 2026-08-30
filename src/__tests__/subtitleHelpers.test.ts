import {
  applyAssStyleOverrides,
  buildSubtitleTrackLabel,
  buildSubtitleUrlCandidates,
  detectSubtitleFormat,
  parseTimedText,
} from '../renderer/utils/subtitleHelpers';

describe('detectSubtitleFormat', () => {
  it('узнаёт формат по полю format', () => {
    expect(detectSubtitleFormat('ASS')).toBe('ass');
    expect(detectSubtitleFormat('ssa')).toBe('ass');
    expect(detectSubtitleFormat('vtt')).toBe('vtt');
    expect(detectSubtitleFormat('srt')).toBe('srt');
  });

  it('без формата смотрит на расширение файла', () => {
    expect(detectSubtitleFormat(undefined, 'track.ass')).toBe('ass');
    expect(detectSubtitleFormat(undefined, 'track.vtt')).toBe('vtt');
  });

  it('неизвестное считает srt', () => {
    expect(detectSubtitleFormat()).toBe('srt');
    expect(detectSubtitleFormat('unknown', 'track.bin')).toBe('srt');
  });
});

describe('buildSubtitleTrackLabel', () => {
  it('берёт имя файла без расширения', () => {
    expect(buildSubtitleTrackLabel({ filename: 'Russian.Full.ass' }, 0)).toBe(
      'Russian.Full',
    );
  });

  it('падает на name, когда имени файла нет', () => {
    expect(buildSubtitleTrackLabel({ name: 'Надписи' }, 0)).toBe('Надписи');
  });

  it('игнорирует UUID вместо названия', () => {
    const label = buildSubtitleTrackLabel(
      {
        filename: '3f2504e0-4f89-11d3-9a0c-0305e82c3301.ass',
        format: 'ass',
      },
      2,
    );

    expect(label).toBe('Дорожка 3 (ASS)');
  });

  it('игнорирует длинный хеш вместо названия', () => {
    const label = buildSubtitleTrackLabel(
      { filename: 'a1b2c3d4e5f60718.srt', format: 'srt' },
      0,
    );

    expect(label).toBe('Дорожка 1 (SRT)');
  });

  it('без формата подписывает просто номером', () => {
    expect(buildSubtitleTrackLabel({}, 4)).toBe('Дорожка 5');
  });
});

describe('buildSubtitleUrlCandidates', () => {
  it('оффлайн-ссылку отдаёт как есть, единственным вариантом', () => {
    const src = 'animelib-offline://track.ass';

    expect(buildSubtitleUrlCandidates(src)).toEqual([src]);
  });

  it('абсолютную ссылку не размножает', () => {
    const src = 'https://cdn.example.com/a.srt';

    expect(buildSubtitleUrlCandidates(src)).toEqual([src]);
  });

  it('протоколо-относительной дописывает схему', () => {
    expect(buildSubtitleUrlCandidates('//cdn.example.com/a.srt')).toEqual([
      'https://cdn.example.com/a.srt',
    ]);
  });

  it('относительный путь разворачивает в список зеркал', () => {
    const candidates = buildSubtitleUrlCandidates('subs/a.srt');

    expect(candidates).toHaveLength(3);
    candidates.forEach((url) => expect(url.endsWith('/subs/a.srt')).toBe(true));
    expect(new Set(candidates).size).toBe(3);
  });

  it('ведущий слеш не удваивается', () => {
    const [first] = buildSubtitleUrlCandidates('/subs/a.srt');

    expect(first).toBe('https://video1.cdnlibs.org/subs/a.srt');
  });
});

describe('parseTimedText', () => {
  const SRT = [
    '1',
    '00:00:01,000 --> 00:00:03,500',
    'Первая реплика',
    '',
    '2',
    '00:00:04,000 --> 00:00:06,000',
    'Вторая реплика',
  ].join('\n');

  it('разбирает srt в реплики со временем', () => {
    const cues = parseTimedText(SRT);

    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ from: 1, to: 3.5, text: 'Первая реплика' });
    expect(cues[1].from).toBe(4);
  });

  it('снимает шапку WEBVTT и понимает точку как разделитель', () => {
    const cues = parseTimedText(
      'WEBVTT\n\n00:00:02.250 --> 00:00:04.000\nТекст',
    );

    expect(cues).toHaveLength(1);
    expect(cues[0].from).toBe(2.25);
  });

  it('понимает таймкод без часов', () => {
    const cues = parseTimedText('01:30,000 --> 01:32,000\nТекст');

    expect(cues[0].from).toBe(90);
  });

  it('переносы CRLF не мешают', () => {
    const cues = parseTimedText(SRT.replace(/\n/g, '\r\n'));

    expect(cues).toHaveLength(2);
  });

  it('вычищает разметку из текста', () => {
    const cues = parseTimedText(
      '00:00:01,000 --> 00:00:02,000\n<i>Курсив</i>{\\an8}',
    );

    expect(cues[0].text).toBe('Курсив');
  });

  it('пропускает блоки без времени и без текста', () => {
    const cues = parseTimedText(
      'просто текст\n\n00:00:01,000 --> 00:00:02,000\n\n\n00:00:03,000 --> 00:00:04,000\nОк',
    );

    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Ок');
  });

  it('сортирует реплики по времени начала', () => {
    const cues = parseTimedText(
      '00:00:05,000 --> 00:00:06,000\nПоздняя\n\n00:00:01,000 --> 00:00:02,000\nРанняя',
    );

    expect(cues.map((cue) => cue.text)).toEqual(['Ранняя', 'Поздняя']);
  });

  it('пустой вход даёт пустой список', () => {
    expect(parseTimedText('')).toEqual([]);
  });
});

describe('applyAssStyleOverrides', () => {
  const ASS = [
    '[Script Info]',
    'Title: Test',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontsize, Outline, Shadow, BorderStyle, MarginV',
    'Style: Default,40,2,1,1,20',
    '',
    '[Events]',
    'Format: Layer, Start, End, Text',
    'Dialogue: 0,0:00:01.00,0:00:02.00,Привет',
  ].join('\n');

  const styleLine = (content: string) =>
    content.split('\n').find((line) => line.startsWith('Style:')) ?? '';

  it('масштабирует кегль', () => {
    const patched = applyAssStyleOverrides(ASS, {
      fontScale: 1.5,
      outline: 'outline',
      offsetY: 0,
    });

    expect(styleLine(patched).split(',')[1]).toBe('60');
  });

  it('сдвигает нижний отступ', () => {
    const patched = applyAssStyleOverrides(ASS, {
      fontScale: 1,
      outline: 'outline',
      offsetY: 30,
    });

    expect(styleLine(patched).split(',')[5]).toBe('50');
  });

  it('режим box включает фон, обводка сохраняется', () => {
    const patched = applyAssStyleOverrides(ASS, {
      fontScale: 1,
      outline: 'box',
      offsetY: 0,
    });
    const values = styleLine(patched).split(',');

    expect(values[4]).toBe('3');
    expect(values[2]).toBe('2');
  });

  it('режим none гасит обводку и тень', () => {
    const patched = applyAssStyleOverrides(ASS, {
      fontScale: 1,
      outline: 'none',
      offsetY: 0,
    });
    const values = styleLine(patched).split(',');

    expect(values[2]).toBe('0');
    expect(values[3]).toBe('0');
  });

  it('не трогает секцию событий', () => {
    const patched = applyAssStyleOverrides(ASS, {
      fontScale: 2,
      outline: 'box',
      offsetY: 10,
    });

    expect(patched).toContain('Dialogue: 0,0:00:01.00,0:00:02.00,Привет');
  });

  it('файл без секции стилей возвращается без изменений', () => {
    const plain = '[Script Info]\nTitle: Test';

    expect(
      applyAssStyleOverrides(plain, {
        fontScale: 2,
        outline: 'box',
        offsetY: 10,
      }),
    ).toBe(plain);
  });
});
