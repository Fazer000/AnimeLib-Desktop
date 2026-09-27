import {
  classifyPlayerLoad,
  getResumeTime,
} from '../renderer/utils/playerLoad';

describe('classifyPlayerLoad', () => {
  it('первая загрузка после сброса плеера', () => {
    expect(
      classifyPlayerLoad({
        isInitialLoad: true,
        lastEpisodeId: 10,
        episodeId: 10,
      }),
    ).toBe('initial');
  });

  it('другая озвучка той же серии — смена источника', () => {
    expect(
      classifyPlayerLoad({
        isInitialLoad: false,
        lastEpisodeId: 10,
        episodeId: 10,
      }),
    ).toBe('source');
  });

  it('другая серия — смена серии', () => {
    expect(
      classifyPlayerLoad({
        isInitialLoad: false,
        lastEpisodeId: 10,
        episodeId: 11,
      }),
    ).toBe('episode');
  });

  it('без номера серии — не считается сменой источника', () => {
    expect(
      classifyPlayerLoad({
        isInitialLoad: false,
        lastEpisodeId: null,
        episodeId: undefined,
      }),
    ).toBe('episode');
  });
});

describe('getResumeTime', () => {
  it('продолжает с текущего времени', () => {
    expect(getResumeTime(84.5)).toBe(84.5);
  });

  it('с самого начала и без времени — с начала', () => {
    expect(getResumeTime(0)).toBeNull();
    expect(getResumeTime(Number.NaN)).toBeNull();
  });
});
