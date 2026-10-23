import {
  centerMainRowOffset,
  FranchiseEdge,
  FranchiseGraph,
  FranchiseTitle,
  animeRelationEdges,
  buildTimeScale,
  dedupeRelations,
  findMainLine,
  fitFranchiseRows,
  rowLinkCost,
  formatReleaseMonth,
  isFranchiseLink,
  isSequelLabel,
  laterEnd,
  franchiseRoot,
  layoutFranchise,
  linkedTitles,
  mergeEdges,
  pruneDistantTitles,
  normalizeEdge,
  resolveSide,
  shortenTitle,
  timeToX,
  toYearFraction,
} from '../renderer/utils/franchiseGraph';

const title = (
  slugUrl: string,
  releaseDate: string | null,
  type = 'TV Сериал',
): FranchiseTitle => ({
  slugUrl,
  name: slugUrl,
  type,
  cover: null,
  releaseDate,
});

const graphOf = (
  titles: FranchiseTitle[],
  edges: FranchiseEdge[],
): FranchiseGraph => ({
  titles: new Map(titles.map((item) => [item.slugUrl, item])),
  edges,
});

const relation = (slug: string, label: string, model = 'anime') => ({
  related_type: { label },
  media: { slug_url: slug, model, name: slug },
});

const OPTIONS = {
  nodeWidth: 80,
  gap: 10,
  rowsAbove: 2,
  rowsBelow: 2,
  minYearWidth: 100,
  emptyGapWidth: 40,
  minWidth: 0,
};

describe('dedupeRelations', () => {
  it('убирает повтор той же связи', () => {
    const result = dedupeRelations([
      relation('m', 'Источник', 'manga'),
      relation('m', 'Источник', 'manga'),
      relation('a', 'Продолжение'),
    ]);

    expect(result.map((item) => item.media.slug_url)).toEqual(['m', 'a']);
  });
});

describe('normalizeEdge', () => {
  it('разворачивает предысторию в продолжение', () => {
    expect(normalizeEdge('b', 'a', 'Предыстория')).toEqual({
      from: 'a',
      to: 'b',
      label: 'Продолжение',
      sequel: true,
    });
  });

  it('прочие связи оставляет как есть', () => {
    expect(normalizeEdge('a', 'b', 'Спин-офф').sequel).toBe(false);
  });
});

describe('animeRelationEdges', () => {
  it('берёт только аниме', () => {
    const edges = animeRelationEdges('a', [
      relation('m', 'Источник', 'manga'),
      relation('r', 'Адаптация', 'ranobe'),
      relation('b', 'Продолжение'),
    ]);

    expect(edges).toEqual([
      { from: 'a', to: 'b', label: 'Продолжение', sequel: true },
    ]);
  });
});

describe('mergeEdges', () => {
  it('оставляет одну связь на пару, продолжение важнее', () => {
    const merged = mergeEdges([
      normalizeEdge('a', 'b', 'Другое'),
      normalizeEdge('b', 'a', 'Предыстория'),
      normalizeEdge('a', 'b', 'Продолжение'),
    ]);

    expect(merged).toEqual([
      { from: 'a', to: 'b', label: 'Продолжение', sequel: true },
    ]);
  });

  it('отбрасывает связь тайтла с самим собой', () => {
    expect(mergeEdges([normalizeEdge('a', 'a', 'Другое')])).toEqual([]);
  });
});

describe('findMainLine', () => {
  const graph = graphOf(
    ['s1', 's2', 's3', 'f1', 'f2', 'x'].map((slug) => title(slug, null)),
    [
      normalizeEdge('s1', 's2', 'Продолжение'),
      normalizeEdge('s2', 's3', 'Продолжение'),
      normalizeEdge('f1', 'f2', 'Продолжение'),
      normalizeEdge('s1', 'f1', 'Обобщение'),
    ],
  );

  it('цепочка текущего сериала — основная, даже если есть длиннее', () => {
    expect([...findMainLine(graph, 'f1')].sort()).toEqual(['f1', 'f2']);
  });

  it('одиночный тайтл — основная самая длинная цепочка сериалов', () => {
    expect([...findMainLine(graph, 'x')].sort()).toEqual(['s1', 's2', 's3']);
  });

  it('цепочка текущего фильма — основная', () => {
    const films = graphOf(
      [
        title('s1', null),
        title('s2', null),
        title('m1', null, 'Фильм'),
        title('m2', null, 'Фильм'),
      ],
      [
        normalizeEdge('s1', 's2', 'Продолжение'),
        normalizeEdge('m1', 'm2', 'Продолжение'),
        normalizeEdge('s1', 'm1', 'Другое'),
      ],
    );
    expect([...findMainLine(films, 'm2')].sort()).toEqual(['m1', 'm2']);
  });

  it('цепочка текущей ONA — основная, как у сериала', () => {
    const ona = graphOf(
      [
        title('s1', null),
        title('s2', null),
        title('s3', null),
        title('o1', null, 'ONA'),
        title('o2', null, 'ONA'),
      ],
      [
        normalizeEdge('s1', 's2', 'Продолжение'),
        normalizeEdge('s2', 's3', 'Продолжение'),
        normalizeEdge('o1', 'o2', 'Продолжение'),
        normalizeEdge('s1', 'o1', 'Другое'),
      ],
    );
    expect([...findMainLine(ona, 'o2')].sort()).toEqual(['o1', 'o2']);
  });

  it('цепочка из одних спецвыпусков не становится основной', () => {
    const specials = graphOf(
      [
        title('s1', null),
        title('s2', null),
        title('sp1', null, 'Спешл'),
        title('sp2', null, 'Спешл'),
      ],
      [
        normalizeEdge('s1', 's2', 'Продолжение'),
        normalizeEdge('sp1', 'sp2', 'Продолжение'),
        normalizeEdge('s1', 'sp1', 'Другое'),
      ],
    );
    expect([...findMainLine(specials, 'sp2')].sort()).toEqual(['s1', 's2']);
  });

  it('без продолжений основная линия — текущий тайтл', () => {
    expect([...findMainLine(graphOf([title('x', null)], []), 'x')]).toEqual([
      'x',
    ]);
  });

  it('без сериалов основная линия — цепочка текущего тайтла', () => {
    const ona = graphOf(
      [
        title('cur1', null, 'ONA'),
        title('cur2', null, 'ONA'),
        title('hub1', null, 'ONA'),
        title('hub2', null, 'ONA'),
        title('x', null, 'ONA'),
        title('y', null, 'ONA'),
      ],
      [
        normalizeEdge('cur1', 'cur2', 'Продолжение'),
        normalizeEdge('hub1', 'hub2', 'Продолжение'),
        normalizeEdge('hub1', 'x', 'Другое'),
        normalizeEdge('hub1', 'y', 'Другое'),
        normalizeEdge('hub1', 'cur1', 'Другое'),
      ],
    );

    expect([...findMainLine(ona, 'cur2')].sort()).toEqual(['cur1', 'cur2']);
  });

  it('сериал важнее ONA, к которой привязано много короткометражек', () => {
    const hub = graphOf(
      [
        title('tv', null),
        title('ona', null, 'ONA'),
        title('s1', null, 'Неизвестный'),
        title('s2', null, 'Неизвестный'),
        title('s3', null, 'Неизвестный'),
      ],
      [
        normalizeEdge('tv', 'ona', 'Другое'),
        normalizeEdge('ona', 's1', 'Другое'),
        normalizeEdge('ona', 's2', 'Другое'),
        normalizeEdge('ona', 's3', 'Другое'),
      ],
    );

    expect([...findMainLine(hub, 's1')]).toEqual(['tv']);
  });

  it('сериал без продолжений, но с множеством связей важнее цепочки', () => {
    const mixed = graphOf(
      [
        title('tv', null),
        title('sp1', null, 'Спешл'),
        title('sp2', null, 'Спешл'),
        title('f1', null, 'Фильм'),
        title('f2', null, 'Фильм'),
        title('f3', null, 'Фильм'),
      ],
      [
        normalizeEdge('sp1', 'sp2', 'Продолжение'),
        normalizeEdge('tv', 'sp1', 'Другое'),
        normalizeEdge('tv', 'f1', 'Другое'),
        normalizeEdge('tv', 'f2', 'Другое'),
        normalizeEdge('tv', 'f3', 'Другое'),
      ],
    );

    expect([...findMainLine(mixed, 'sp1')]).toEqual(['tv']);
  });

  it('при равных связях выбирает группу с сериалами', () => {
    const mixed = graphOf(
      [
        title('tv', null),
        title('f1', null, 'Фильм'),
        title('sp1', null, 'Спешл'),
        title('sp2', null, 'Спешл'),
      ],
      [
        normalizeEdge('sp1', 'sp2', 'Продолжение'),
        normalizeEdge('tv', 'sp1', 'Другое'),
        normalizeEdge('tv', 'f1', 'Другое'),
      ],
    );

    expect([...findMainLine(mixed, 'sp2')]).toEqual(['tv']);
  });

  it('при равной длине выбирает цепочку текущего', () => {
    const tie = graphOf(
      ['a', 'b', 'c', 'd'].map((slug) => title(slug, null)),
      [
        normalizeEdge('a', 'b', 'Продолжение'),
        normalizeEdge('c', 'd', 'Продолжение'),
      ],
    );

    expect([...findMainLine(tie, 'd')].sort()).toEqual(['c', 'd']);
  });
});

describe('isFranchiseLink', () => {
  it('не идёт дальше по кроссоверу', () => {
    expect(isFranchiseLink('Кроссовер')).toBe(false);
    expect(isFranchiseLink('Спин-офф')).toBe(true);
  });
});

describe('isSequelLabel', () => {
  it('продолжение и предыстория — шаги по сюжету', () => {
    expect(isSequelLabel('Продолжение')).toBe(true);
    expect(isSequelLabel('Предыстория')).toBe(true);
    expect(isSequelLabel('Другое')).toBe(false);
  });
});

describe('pruneDistantTitles', () => {
  const graph = graphOf(
    ['m1', 'm2', 'side', 'sideNext', 'far', 'cur'].map((slug) =>
      title(slug, null),
    ),
    [
      normalizeEdge('m1', 'm2', 'Продолжение'),
      normalizeEdge('m2', 'side', 'Другое'),
      normalizeEdge('side', 'sideNext', 'Продолжение'),
      normalizeEdge('sideNext', 'far', 'Другое'),
      normalizeEdge('far', 'cur', 'Другое'),
    ],
  );

  it('оставляет шаг от основной линии и продолжения ответвлений', () => {
    const pruned = pruneDistantTitles(graph, new Set(['m1', 'm2']), 'm1', 1);

    expect([...pruned.titles.keys()].sort()).toEqual([
      'm1',
      'm2',
      'side',
      'sideNext',
    ]);
    expect(pruned.edges).toHaveLength(3);
  });

  it('текущий тайтл остаётся, даже если он дальше', () => {
    const pruned = pruneDistantTitles(graph, new Set(['m1', 'm2']), 'cur', 1);

    expect(pruned.titles.has('cur')).toBe(true);
    expect(pruned.titles.has('far')).toBe(false);
  });
});

describe('resolveSide', () => {
  const graph = graphOf(
    [
      title('main', null),
      title('film', null, 'Фильм'),
      title('recap', null, 'Неизвестный'),
      title('ova', null, 'OVA'),
    ],
    [
      normalizeEdge('main', 'recap', 'Обобщение'),
      normalizeEdge('main', 'ova', 'Спин-офф'),
      normalizeEdge('ova', 'main', 'Обобщение'),
    ],
  );
  const main = new Set(['main']);

  it('фильмы и пересказы сверху, прочее снизу', () => {
    expect(resolveSide('main', graph, main)).toBe(0);
    expect(resolveSide('film', graph, main)).toBe(-1);
    expect(resolveSide('recap', graph, main)).toBe(-1);
    expect(resolveSide('ova', graph, main)).toBe(1);
  });
});

describe('toYearFraction', () => {
  it('переводит дату в дробный год', () => {
    expect(toYearFraction('2020-01-01')).toBe(2020);
    expect(toYearFraction('2020-07-01')).toBeCloseTo(2020.5);
  });

  it('пустая или нечитаемая дата — null', () => {
    expect(toYearFraction(null)).toBeNull();
    expect(toYearFraction('зима 2020')).toBeNull();
  });
});

describe('shortenTitle', () => {
  it('убирает общее начало с разделителем', () => {
    expect(shortenTitle('Атака титанов: Хроника', 'Атака титанов')).toBe(
      'Хроника',
    );
    expect(shortenTitle('Финал — Спецвыпуски', 'Финал')).toBe('Спецвыпуски');
  });

  it('без разделителя и для самого корня название не меняется', () => {
    expect(shortenTitle('Атака титанов 2', 'Атака титанов')).toBe(
      'Атака титанов 2',
    );
    expect(shortenTitle('Атака титанов', 'Атака титанов')).toBe(
      'Атака титанов',
    );
    expect(shortenTitle('Хроника', '')).toBe('Хроника');
  });
});

describe('franchiseRoot', () => {
  it('берёт самый ранний тайтл основной линии', () => {
    const graph = graphOf(
      [title('b', '2017-01-01'), title('a', '2013-01-01'), title('c', null)],
      [],
    );

    expect(franchiseRoot(graph, new Set(['b', 'a', 'c']))).toBe('a');
  });
});

describe('formatReleaseMonth', () => {
  it('пишет месяц и год', () => {
    expect(formatReleaseMonth('2018-07-23')).toBe('июль 2018');
    expect(formatReleaseMonth('2013-01-01')).toBe('янв. 2013');
  });

  it('без даты — пустая строка', () => {
    expect(formatReleaseMonth(null)).toBe('');
    expect(formatReleaseMonth('2018')).toBe('');
  });
});

describe('buildTimeScale', () => {
  it('схлопывает подряд идущие пустые годы в один разрыв', () => {
    const segments = buildTimeScale(
      new Map([
        [2013, 100],
        [2014, 150],
        [2018, 100],
      ]),
      40,
      0,
    );

    expect(segments).toEqual([
      { year: 2013, label: '2013', start: 0, width: 100 },
      { year: 2014, label: '2014', start: 100, width: 150 },
      { year: null, label: '2015–2017', start: 250, width: 40 },
      { year: 2018, label: '2018', start: 290, width: 100 },
    ]);
  });

  it('один пустой год подписывает одним числом', () => {
    const segments = buildTimeScale(
      new Map([
        [2013, 100],
        [2015, 100],
      ]),
      40,
      0,
    );

    expect(segments[1].label).toBe('2014');
  });

  it('растягивает годы до ширины области, разрывы не трогает', () => {
    const segments = buildTimeScale(
      new Map([
        [2013, 100],
        [2016, 100],
      ]),
      40,
      440,
    );

    expect(segments.map((item) => item.width)).toEqual([200, 40, 200]);
  });
});

describe('timeToX', () => {
  const segments = buildTimeScale(
    new Map([
      [2013, 100],
      [2016, 200],
    ]),
    40,
    0,
  );

  it('ставит дату внутри своего года', () => {
    expect(timeToX(segments, 2013.5)).toBe(50);
    expect(timeToX(segments, 2016.25)).toBe(190);
  });

  it('дату вне шкалы прижимает к краю', () => {
    expect(timeToX(segments, 2010)).toBe(0);
    expect(timeToX(segments, 2030)).toBe(340);
  });
});

describe('linkedTitles', () => {
  it('собирает соседей по связям в обе стороны', () => {
    const edges = [
      normalizeEdge('a', 'b', 'Продолжение'),
      normalizeEdge('c', 'a', 'Другое'),
      normalizeEdge('b', 'c', 'Другое'),
    ];

    expect([...linkedTitles(edges, 'a')].sort()).toEqual(['b', 'c']);
  });
});

describe('layoutFranchise', () => {
  it('ставит тайтлы по дате, пустые годы схлопывает', () => {
    const graph = graphOf(
      [title('a', '2013-01-01'), title('b', '2015-01-01')],
      [normalizeEdge('a', 'b', 'Продолжение')],
    );
    const layout = layoutFranchise(graph, new Set(['a', 'b']), OPTIONS);

    expect(layout.segments.map((item) => item.label)).toEqual([
      '2013',
      '2014',
      '2015',
    ]);
    expect(layout.nodes.get('a')).toEqual({ slugUrl: 'a', x: 0, row: 0 });
    expect(layout.nodes.get('b')).toEqual({ slugUrl: 'b', x: 140, row: 0 });
  });

  it('расширяет год под тайтлы основной линии и сохраняет их порядок', () => {
    const graph = graphOf(
      [title('a', '2013-01-01'), title('b', '2013-04-01')],
      [normalizeEdge('a', 'b', 'Продолжение')],
    );
    const layout = layoutFranchise(graph, new Set(['a', 'b']), OPTIONS);

    expect(layout.segments[0].width).toBe(180);
    expect(layout.nodes.get('b')?.x).toBe(90);
  });

  it('разносит близкие ответвления по рядам своей стороны', () => {
    const graph = graphOf(
      [
        title('main', '2013-01-01'),
        title('o1', '2014-01-01', 'OVA'),
        title('o2', '2014-02-01', 'OVA'),
        title('o3', '2014-03-01', 'OVA'),
      ],
      [],
    );
    const layout = layoutFranchise(graph, new Set(['main']), OPTIONS);
    const rows = ['o1', 'o2', 'o3'].map((slug) => layout.nodes.get(slug)?.row);

    expect(rows).toEqual([1, 2, 1]);
    expect(layout.nodes.get('o3')?.x).toBe(190);
    expect(layout.maxRow).toBe(2);
  });

  it('тайтл без даты встаёт на год связанного', () => {
    const graph = graphOf(
      [
        title('a', '2013-01-01'),
        title('b', '2016-01-01'),
        title('s', null, 'OVA'),
      ],
      [normalizeEdge('b', 's', 'Другое')],
    );
    const layout = layoutFranchise(graph, new Set(['a', 'b']), OPTIONS);

    expect(layout.nodes.get('s')).toEqual({ slugUrl: 's', x: 140, row: 1 });
  });

  it('ширина не меньше области', () => {
    const graph = graphOf([title('a', '2013-01-01')], []);
    const layout = layoutFranchise(graph, new Set(['a']), {
      ...OPTIONS,
      minWidth: 600,
    });

    expect(layout.width).toBe(600);
    expect(layout.segments[0].width).toBe(600);
  });
});

describe('laterEnd', () => {
  const titles = new Map(
    [
      title('s1', '2013-04-07'),
      title('s2', '2017-04-01'),
      title('film', '2014-11-22', 'Фильм'),
      title('soon', null, 'Фильм'),
    ].map((item) => [item.slugUrl, item]),
  );

  it('у продолжения позже смотрится само продолжение', () => {
    expect(laterEnd(normalizeEdge('s2', 's1', 'Предыстория'), titles)).toBe(
      's2',
    );
  });

  it('у прочих связей позже тот, кто вышел позже', () => {
    expect(laterEnd(normalizeEdge('s2', 'film', 'Другое'), titles)).toBe('s2');
    expect(laterEnd(normalizeEdge('s1', 'film', 'Обобщение'), titles)).toBe(
      'film',
    );
  });

  it('невышедший тайтл без даты смотрится позже', () => {
    expect(laterEnd(normalizeEdge('soon', 's2', 'Другое'), titles)).toBe(
      'soon',
    );
    expect(laterEnd(normalizeEdge('s2', 'soon', 'Другое'), titles)).toBe(
      'soon',
    );
  });
});

describe('fitFranchiseRows', () => {
  const base = { above: 2, below: 3 };

  it('мало места — обычные ряды', () => {
    expect(fitFranchiseRows(300, 84, base)).toEqual(base);
  });

  it('много места — больше рядов в той же пропорции', () => {
    expect(fitFranchiseRows(84 * 11, 84, base)).toEqual({ above: 4, below: 6 });
  });
});

describe('раскладка с учётом связей', () => {
  const graph = graphOf(
    [
      title('main', '2010-01-01'),
      title('x', '2011-01-01', 'OVA'),
      title('p1', '2011-02-01', 'OVA'),
      title('p2', '2015-01-01', 'OVA'),
    ],
    [normalizeEdge('p1', 'p2', 'Продолжение')],
  );

  it('продолжение встаёт в ряд своей предыстории', () => {
    const plain = layoutFranchise(graph, new Set(['main']), OPTIONS);
    const linked = layoutFranchise(graph, new Set(['main']), {
      ...OPTIONS,
      linkAware: true,
    });

    expect(plain.nodes.get('p1')?.row).toBe(2);
    expect(plain.nodes.get('p2')?.row).toBe(1);
    expect(linked.nodes.get('p2')?.row).toBe(2);
  });

  it('ширина лет считается по заданным рядам, а не по числу рядов раскладки', () => {
    const base = layoutFranchise(graph, new Set(['main']), OPTIONS);
    const more = layoutFranchise(graph, new Set(['main']), {
      ...OPTIONS,
      rowsBelow: 6,
      yearRows: { above: OPTIONS.rowsAbove, below: OPTIONS.rowsBelow },
    });

    expect(more.segments).toEqual(base.segments);
  });

  it('стоимость ряда: продолжение тянет сильнее прочих связей', () => {
    expect(rowLinkCost(2, [{ row: 2, sequel: true }])).toBeLessThan(
      rowLinkCost(1, [{ row: 2, sequel: true }]),
    );
    expect(
      rowLinkCost(1, [
        { row: 1, sequel: true },
        { row: 2, sequel: false },
      ]),
    ).toBeLessThan(
      rowLinkCost(2, [
        { row: 1, sequel: true },
        { row: 2, sequel: false },
      ]),
    );
  });
});

describe('centerMainRowOffset', () => {
  it('ставит основную историю посередине, когда рядов мало', () => {
    expect(centerMainRowOffset(0, 124, 800)).toBe(338);
  });

  it('учитывает ряды над основной историей', () => {
    expect(centerMainRowOffset(-1, 124, 800)).toBe(214);
  });

  it('без отступа, когда рядов над основной историей больше половины', () => {
    expect(centerMainRowOffset(-5, 124, 800)).toBe(0);
  });
});
