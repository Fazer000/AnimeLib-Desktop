import { buildMediaMetadata } from '../renderer/utils/mediaMetadata';

const FULL = {
  title: 'Блич',
  episodeNumber: '17',
  episodeName: 'Ичиго умирает!',
  teamName: 'AniLibria.TV',
  artworkUrl: 'blob:cover',
};

describe('buildMediaMetadata', () => {
  it('собирает название, серию, озвучку и обложку', () => {
    expect(buildMediaMetadata(FULL)).toEqual({
      title: 'Блич',
      artist: 'Эпизод 17 • Ичиго умирает!',
      album: 'AniLibria.TV',
      artwork: [{ src: 'blob:cover' }],
    });
  });

  it('без названия серии остаётся только номер', () => {
    expect(buildMediaMetadata({ ...FULL, episodeName: '' }).artist).toBe(
      'Эпизод 17',
    );
  });

  it('дробный номер серии сохраняется как есть', () => {
    expect(
      buildMediaMetadata({ ...FULL, episodeNumber: '12.5', episodeName: '' })
        .artist,
    ).toBe('Эпизод 12.5');
  });

  it('без номера серии остаётся только её название', () => {
    expect(buildMediaMetadata({ ...FULL, episodeNumber: '  ' }).artist).toBe(
      'Ичиго умирает!',
    );
  });

  it('без обложки список картинок пустой', () => {
    expect(buildMediaMetadata({ ...FULL, artworkUrl: '' }).artwork).toEqual([]);
  });

  it('пробелы по краям обрезаются', () => {
    const metadata = buildMediaMetadata({
      ...FULL,
      title: ' Блич ',
      teamName: ' AniLibria.TV ',
    });

    expect(metadata.title).toBe('Блич');
    expect(metadata.album).toBe('AniLibria.TV');
  });
});
