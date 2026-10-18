import {
  RangeRequestError,
  inspectRangeLimit,
} from '../renderer/utils/rangeLimit';

describe('inspectRangeLimit', () => {
  it('429, 503 и 403 требуют переждать', () => {
    [429, 503, 403].forEach((status) => {
      expect(inspectRangeLimit(new RangeRequestError(status)).limited).toBe(
        true,
      );
    });
  });

  it('передаёт Retry-After сервера', () => {
    expect(inspectRangeLimit(new RangeRequestError(429, '12'))).toEqual({
      limited: true,
      retryAfter: '12',
    });
  });

  it('прочие статусы и ошибки сети пережидать не нужно', () => {
    expect(inspectRangeLimit(new RangeRequestError(200)).limited).toBe(false);
    expect(inspectRangeLimit(new RangeRequestError(404)).limited).toBe(false);
    expect(inspectRangeLimit(new TypeError('Failed to fetch')).limited).toBe(
      false,
    );
  });
});
