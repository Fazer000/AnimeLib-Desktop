import {
  SLIDE_BACK,
  SLIDE_FORWARD,
  getMenuDirection,
  getPageAnimationName,
} from '../renderer/components/player/settings/navigation';

describe('getMenuDirection', () => {
  it('уход на вложенную страницу идёт вперёд', () => {
    expect(getMenuDirection('quality')).toBe('forward');
    expect(getMenuDirection('subtitles')).toBe('forward');
  });

  it('возврат на главную идёт назад', () => {
    expect(getMenuDirection('main')).toBe('back');
  });
});

describe('getPageAnimationName', () => {
  it('вперёд страница въезжает справа', () => {
    expect(getPageAnimationName('forward')).toBe(SLIDE_FORWARD);
  });

  it('назад страница въезжает слева', () => {
    expect(getPageAnimationName('back')).toBe(SLIDE_BACK);
  });

  it('без направления анимации нет', () => {
    expect(getPageAnimationName('none')).toBeNull();
  });
});
