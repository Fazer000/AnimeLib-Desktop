import isNearBookmark from '../renderer/utils/bookmarkPosition';

describe('isNearBookmark', () => {
  test.each([
    [239, 300, false],
    [240, 300, true],
    [300, 300, true],
    [360, 300, true],
    [361, 300, false],
    [0, 0, true],
    [0, null, false],
  ])('time %s, bookmark %s', (time, bookmark, expected) => {
    expect(isNearBookmark(time, bookmark)).toBe(expected);
  });
});
