import { buildEdgeFadeMask } from '../renderer/utils/edgeFade';

describe('buildEdgeFadeMask', () => {
  it('затухает с обеих сторон, когда скрыто содержимое и слева, и справа', () => {
    expect(buildEdgeFadeMask(true, true, 56, '#000')).toBe(
      'linear-gradient(to right, transparent 0px, #000 56px, #000 calc(100% - 56px), transparent 100%)',
    );
  });

  it('в начале ленты затухает только правый край', () => {
    const mask = buildEdgeFadeMask(false, true, 56, '#000');

    expect(mask).toContain('#000 0px, #000 0px');
    expect(mask).toContain('transparent 100%');
  });

  it('в конце ленты затухает только левый край', () => {
    const mask = buildEdgeFadeMask(true, false, 56, '#000');

    expect(mask).toContain('transparent 0px, #000 56px');
    expect(mask).toContain('#000 calc(100% - 0px), #000 100%');
  });

  it('без скрытого содержимого маска полностью непрозрачна', () => {
    expect(buildEdgeFadeMask(false, false, 56, '#000')).not.toContain(
      'transparent',
    );
  });
});
