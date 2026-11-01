import {
  buildVideoUrls,
  orderVideoServers,
  videoServerOrigins,
} from '../shared/videoServers';

const servers = [
  { id: 'main', url: 'https://a.test/.x' },
  { id: 'secondary_1', url: 'https://b.test' },
  { id: 'secondary_2', url: 'https://c.test' },
];

describe('orderVideoServers', () => {
  it('ставит сервер плеера первым, остальные сохраняют порядок', () => {
    expect(
      orderVideoServers('secondary_2', servers).map((server) => server.id),
    ).toEqual(['secondary_2', 'main', 'secondary_1']);
  });

  it('без video_domain или с неизвестным оставляет порядок сайта', () => {
    [undefined, null, 'secondary_9'].forEach((domain) =>
      expect(
        orderVideoServers(domain, servers).map((server) => server.id),
      ).toEqual(['main', 'secondary_1', 'secondary_2']),
    );
  });
});

describe('buildVideoUrls', () => {
  it('путь дописывается к каждому серверу', () => {
    expect(buildVideoUrls('/v/1.mp4', 'secondary_1', servers)).toEqual([
      'https://b.test/v/1.mp4',
      'https://a.test/.x/v/1.mp4',
      'https://c.test/v/1.mp4',
    ]);
  });

  it('путь без ведущей косой черты получает её', () => {
    expect(buildVideoUrls('v/1.mp4', 'main', servers)[0]).toBe(
      'https://a.test/.x/v/1.mp4',
    );
  });

  it('абсолютная ссылка идёт первой, серверы — запасными', () => {
    expect(
      buildVideoUrls('https://b.test/v/1.mp4', 'secondary_1', servers),
    ).toEqual([
      'https://b.test/v/1.mp4',
      'https://a.test/.x/v/1.mp4',
      'https://c.test/v/1.mp4',
    ]);
  });

  it('у ссылки на сервер с префиксом пути префикс не переносится', () => {
    expect(
      buildVideoUrls('https://a.test/.x/v/1.mp4', 'main', servers),
    ).toEqual([
      'https://a.test/.x/v/1.mp4',
      'https://b.test/v/1.mp4',
      'https://c.test/v/1.mp4',
    ]);
  });

  it('протоколо-относительная ссылка только получает схему', () => {
    expect(buildVideoUrls('//d.test/v.mp4', 'main', servers)).toEqual([
      'https://d.test/v.mp4',
    ]);
  });
});

describe('videoServerOrigins', () => {
  it('отдаёт домены серверов без пути и повторов', () => {
    expect(
      videoServerOrigins([
        ...servers,
        { id: 'extra', url: 'https://a.test/other' },
      ]),
    ).toEqual(['https://a.test', 'https://b.test', 'https://c.test']);
  });
});
