import {
  AutoQualityPolicy,
  autoQualityCaption,
  qualitySummary,
  highestWithin,
  pickManualQuality,
  playerPixelHeight,
  qualityHeight,
  sizeCapHeight,
} from '../renderer/utils/autoQuality';
import { bufferedAhead } from '../renderer/utils/bufferAhead';

const ALL = ['1080p', '720p', '480p'];
const playing = { playing: true, buffering: false, bufferAhead: 10 };

/** Прогоняет шаги раз в секунду и возвращает первое решение */
const run = (
  policy: AutoQualityPolicy,
  state: typeof playing,
  from: number,
  seconds: number,
) => {
  for (let t = from; t <= from + seconds * 1000; t += 1000) {
    const next = policy.sample(state, t);
    if (next) return { next, at: t };
  }
  return null;
};

describe('размер плеера', () => {
  it('высота кадра 16:9 с учётом масштаба экрана', () => {
    expect(playerPixelHeight(1280, 900, 1)).toBe(720);
    expect(playerPixelHeight(1920, 1080, 1.5)).toBe(1620);
  });

  it('потолок — самое низкое качество, которого хватает', () => {
    expect(sizeCapHeight(700, ALL)).toBe(720);
    expect(sizeCapHeight(1000, ALL)).toBe(1080);
    expect(sizeCapHeight(2000, ALL)).toBe(1080);
    expect(sizeCapHeight(300, ALL)).toBe(480);
  });
});

describe('выбор из списка', () => {
  it('самое высокое в пределе, иначе самое низкое', () => {
    expect(highestWithin(ALL, 720)).toBe('720p');
    expect(highestWithin(ALL, 360)).toBe('480p');
    expect(qualityHeight('1080p')).toBe(1080);
  });

  it('ручной выбор: то же качество или ближайшее ниже', () => {
    expect(pickManualQuality(ALL, '720p')).toBe('720p');
    expect(pickManualQuality(['720p', '480p'], '1080p')).toBe('720p');
    expect(pickManualQuality(['1080p', '720p'], '480p')).toBe('720p');
  });
});

describe('AutoQualityPolicy', () => {
  it('стартует под размер плеера', () => {
    const policy = new AutoQualityPolicy(ALL);
    expect(policy.initial(720, 0)).toBe('720p');
    expect(policy.reason(0)).toBe('size');
  });

  it('понижает, если воспроизведение долго ждёт буфер', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(1080, 0);
    const stalled = { playing: true, buffering: true, bufferAhead: 0 };

    expect(policy.sample(stalled, 6000)).toBeNull();
    expect(policy.sample(stalled, 7600)).toBe('720p');
  });

  it('ожидание сразу после смены качества не считается', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(1080, 0);
    policy.noteSwitch('1080p', 0);
    const stalled = { playing: true, buffering: true, bufferAhead: 0 };

    expect(run(policy, stalled, 0, 4)).toBeNull();
  });

  it('понижает, если запас буфера долго мал', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(1080, 0);
    const low = { ...playing, bufferAhead: 1 };

    expect(run(policy, low, 10000, 20)?.at).toBe(16000);
  });

  it('после понижения не возвращается к прежнему качеству, пока действует потолок', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(1080, 0);
    const stalled = { playing: true, buffering: true, bufferAhead: 0 };
    const next = run(policy, stalled, 10000, 5)!;
    policy.noteSwitch(next.next, next.at);

    expect(policy.reason(next.at)).toBe('network');
    const healthy = { ...playing, bufferAhead: 30 };
    expect(run(policy, healthy, next.at + 1000, 120)).toBeNull();
  });

  it('повышает по шагу, когда запас долго большой', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(1080, 0);
    policy.noteSwitch('480p', 0);
    const healthy = { ...playing, bufferAhead: 25 };

    const up = run(policy, healthy, 1000, 60)!;
    expect(up.next).toBe('720p');
    expect(up.at).toBeGreaterThanOrEqual(30000);
  });

  it('не повышает выше потолка по размеру', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(720, 0);
    policy.noteSwitch('720p', 0);
    const healthy = { ...playing, bufferAhead: 25 };

    expect(run(policy, healthy, 1000, 120)).toBeNull();
  });

  it('уменьшение плеера понижает качество, когда размер устоится', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(1080, 0);
    policy.setCap(480, 1000);

    expect(policy.sample(playing, 2000)).toBeNull();
    expect(policy.sample(playing, 3100)).toBe('480p');
  });

  it('одно качество — решать нечего', () => {
    const policy = new AutoQualityPolicy(['720p']);
    policy.initial(1080, 0);
    expect(
      policy.sample({ playing: true, buffering: true, bufferAhead: 0 }, 9000),
    ).toBeNull();
    expect(policy.reason(0)).toBeNull();
  });
});

describe('bufferedAhead', () => {
  const ranges = (...pairs: Array<[number, number]>) => ({
    length: pairs.length,
    start: (index: number) => pairs[index][0],
    end: (index: number) => pairs[index][1],
  });

  it('запас от позиции до конца её диапазона', () => {
    expect(bufferedAhead(ranges([0, 10], [20, 50]), 25)).toBe(25);
    expect(bufferedAhead(ranges([0, 10]), 4)).toBe(6);
  });

  it('позиция вне загруженного — запаса нет', () => {
    expect(bufferedAhead(ranges([0, 10]), 15)).toBe(0);
    expect(bufferedAhead(ranges(), 3)).toBe(0);
  });
});

describe('подписи меню', () => {
  it('под «Авто» — текущее качество и причина', () => {
    expect(autoQualityCaption('1080p', null)).toBe('Сейчас 1080p');
    expect(autoQualityCaption('720p', 'network')).toBe(
      'Сейчас 720p · медленная сеть',
    );
    expect(autoQualityCaption('720p', 'size')).toBe(
      'Сейчас 720p · под размер окна',
    );
    expect(autoQualityCaption('', 'size')).toBe('');
  });

  it('строка «Качество» в главном меню', () => {
    expect(qualitySummary(true, '1080p')).toBe('Авто · 1080p');
    expect(qualitySummary(true, '')).toBe('Авто');
    expect(qualitySummary(false, '720p')).toBe('720p');
  });
});

describe('потолок по сети между сериями', () => {
  it('новая серия стартует не выше качества, где сеть не справилась', () => {
    const first = new AutoQualityPolicy(ALL);
    first.initial(1080, 0);
    const stalled = { playing: true, buffering: true, bufferAhead: 0 };
    const down = run(first, stalled, 10000, 5)!;
    const ceiling = first.networkCeiling(down.at);

    expect(ceiling?.height).toBe(720);
    const next = new AutoQualityPolicy(ALL, ceiling);
    expect(next.initial(1080, down.at + 1000)).toBe('720p');
    expect(next.reason(down.at + 1000)).toBe('network');
  });

  it('истёкший потолок не переносится', () => {
    const policy = new AutoQualityPolicy(ALL, { height: 480, until: 1000 });
    expect(policy.networkCeiling(2000)).toBeNull();
    expect(policy.initial(1080, 2000)).toBe('1080p');
  });
});

describe('возврат после увеличения плеера', () => {
  it('сниженное под размер качество возвращается сразу, когда размер устоится', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(1080, 0);
    policy.noteSwitch('1080p', 0);
    policy.setCap(480, 1000);
    expect(policy.sample(playing, 3100)).toBe('480p');
    policy.noteSwitch('480p', 3100);
    expect(policy.reason(3100)).toBe('size');

    policy.setCap(1080, 5000);
    expect(policy.sample(playing, 6000)).toBeNull();
    expect(policy.sample(playing, 7100)).toBe('1080p');
  });

  it('качество ниже лучшего без ограничений — без причины в подписи', () => {
    const policy = new AutoQualityPolicy(ALL);
    policy.initial(1080, 0);
    policy.noteSwitch('480p', 0);
    expect(policy.reason(0)).toBeNull();
  });
});

describe('стартовое качество под размер', () => {
  it('при увеличении плеера сразу поднимается', () => {
    const policy = new AutoQualityPolicy(ALL);
    expect(policy.initial(720, 0)).toBe('720p');
    policy.noteSwitch('720p', 0);
    policy.setCap(1080, 1000);
    expect(policy.sample(playing, 3100)).toBe('1080p');
  });

  it('стартовое качество под потолком сети сразу не поднимается', () => {
    const policy = new AutoQualityPolicy(ALL, { height: 480, until: 60000 });
    expect(policy.initial(1080, 0)).toBe('480p');
    policy.noteSwitch('480p', 0);
    expect(run(policy, playing, 1000, 20)).toBeNull();
  });
});
