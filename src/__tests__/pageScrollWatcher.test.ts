import {
  PAGE_SCROLL_MARKER,
  buildPageScrollWatcherScript,
  parsePageScrollMessage,
} from '../renderer/scripts/pageScrollWatcher';

const message = (data: unknown) =>
  `${PAGE_SCROLL_MARKER}${JSON.stringify(data)}`;

describe('parsePageScrollMessage', () => {
  const state = { scrolled: true, width: 1200, height: 800, chat: null };

  it('разбирает состояние без мини-чата', () => {
    expect(parsePageScrollMessage(message(state))).toEqual(state);
  });

  it('разбирает место мини-чата', () => {
    const chat = { left: 1056, top: 744, right: 1184, bottom: 784 };

    expect(parsePageScrollMessage(message({ ...state, chat }))?.chat).toEqual(
      chat,
    );
  });

  it('неполный прямоугольник чата считает отсутствующим', () => {
    const chat = { left: 1, top: 2 };

    expect(
      parsePageScrollMessage(message({ ...state, chat }))?.chat,
    ).toBeNull();
  });

  it('чужие и битые сообщения отбрасывает', () => {
    expect(parsePageScrollMessage('обычный лог страницы')).toBeNull();
    expect(parsePageScrollMessage(`${PAGE_SCROLL_MARKER}{сломано`)).toBeNull();
    expect(parsePageScrollMessage(message({ width: 1, height: 1 }))).toBeNull();
    expect(parsePageScrollMessage(undefined)).toBeNull();
  });

  it('маркер должен стоять в начале', () => {
    expect(parsePageScrollMessage(`шум ${message(state)}`)).toBeNull();
  });
});

describe('buildPageScrollWatcherScript', () => {
  it('подставляет порог и маркер', () => {
    const script = buildPageScrollWatcherScript(300);

    expect(script).toContain('window.scrollY > 300');
    expect(script).toContain(PAGE_SCROLL_MARKER);
  });
});
