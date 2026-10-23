/**
 * Папка закладок тайтла: список папок пользователя и перенос тайтла между ними
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { animeApi, AnimeBookmark, BookmarkFolder } from '../api/animeApi';
import { createLogger } from '../../shared/logger';

const log = createLogger('useAnimeBookmarkFolder');

export interface AnimeBookmarkFolderState {
  folders: BookmarkFolder[];
  bookmark: AnimeBookmark | null;
  loaded: boolean;
  busy: boolean;
  moveTo: (status: number) => Promise<void>;
  remove: () => Promise<void>;
  createFolder: (name: string) => Promise<boolean>;
}

/** Загружает папки и закладку тайтла и меняет папку тайтла */
export function useAnimeBookmarkFolder(
  animeSlugUrl: string | null,
  active: boolean,
): AnimeBookmarkFolderState {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [bookmark, setBookmark] = useState<AnimeBookmark | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    setBookmark(null);
    setLoaded(false);
    loadedRef.current = false;
  }, [animeSlugUrl]);

  useEffect(() => {
    if (!animeSlugUrl || (!active && loadedRef.current)) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const [folderList, response] = await Promise.all([
          animeApi.getBookmarkFolders(),
          animeApi.getAnimeBookmark(animeSlugUrl),
        ]);
        if (cancelled) return;
        setFolders(folderList);
        setBookmark(response.data);
        setLoaded(true);
        loadedRef.current = true;
      } catch (error) {
        log.error('Failed to load bookmark folder:', error);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [active, animeSlugUrl]);

  const moveTo = useCallback(
    async (status: number) => {
      if (!animeSlugUrl) return;

      setBusy(true);
      try {
        const saved = await animeApi.setBookmarkFolder(animeSlugUrl, status);
        setBookmark(
          saved?.id
            ? saved
            : (await animeApi.getAnimeBookmark(animeSlugUrl)).data,
        );
      } catch (error) {
        log.error('Failed to move anime to folder:', error);
      } finally {
        setBusy(false);
      }
    },
    [animeSlugUrl],
  );

  const remove = useCallback(async () => {
    if (!bookmark) return;

    setBusy(true);
    try {
      await animeApi.deleteBookmark(bookmark.id);
      setBookmark(null);
    } catch (error) {
      log.error('Failed to delete bookmark:', error);
    } finally {
      setBusy(false);
    }
  }, [bookmark]);

  const createFolder = useCallback(async (name: string) => {
    try {
      const folder = await animeApi.createBookmarkFolder(name);
      setFolders((current) => [...current, folder]);
      return true;
    } catch (error) {
      log.error('Failed to create bookmark folder:', error);
      return false;
    }
  }, []);

  return { folders, bookmark, loaded, busy, moveTo, remove, createFolder };
}

export default useAnimeBookmarkFolder;
