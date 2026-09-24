import { formatUpscaleStats } from '../renderer/utils/upscaleStats';

describe('formatUpscaleStats', () => {
  it('собирает подпись из размеров, времени кадра и доли просрочек', () => {
    expect(
      formatUpscaleStats({
        frameTimeMs: 2.84,
        overBudgetShare: 0.126,
        sourceSize: { width: 1920, height: 1080 },
        targetSize: { width: 2400, height: 1350 },
      }),
    ).toBe('Anime4K A · 1920×1080 → 2400×1350 · ≈2.8 мс · сверх 60 Гц 13%');
  });
});
