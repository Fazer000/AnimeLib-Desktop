import type { QualityOption } from '../renderer/services/player/ShakaPlayerManager';
import { pickThumbnailSource } from '../renderer/utils/thumbnailSource';

const option = (
  value: string,
  type: QualityOption['type'] = 'progressive',
): QualityOption => ({ label: value, value, src: `src-${value}`, type });

describe('pickThumbnailSource', () => {
  it('берёт самое низкое качество независимо от порядка', () => {
    const options = [option('1080p'), option('360p'), option('720p')];

    expect(pickThumbnailSource(options)).toBe('src-360p');
  });

  it('пропускает HLS-варианты', () => {
    const options = [option('360p', 'hls'), option('720p')];

    expect(pickThumbnailSource(options)).toBe('src-720p');
  });

  it('скачанные копии тоже подходят', () => {
    expect(pickThumbnailSource([option('480p (оффлайн)')])).toBe(
      'src-480p (оффлайн)',
    );
  });

  it('без прогрессивных вариантов отдаёт null', () => {
    expect(pickThumbnailSource([])).toBeNull();
    expect(pickThumbnailSource([option('720p', 'hls')])).toBeNull();
  });
});
