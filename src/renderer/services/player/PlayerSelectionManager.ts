/** Выбор плеера */

import { Player } from '../../api/animeApi';
import { PLAYER_TYPE_ANIMELIB, PLAYER_TYPE_KODIK } from '../../../constants';

import { createLogger } from '../../../shared/logger';

const log = createLogger('PlayerSelectionManager');

export interface PlayerPreferences {
  teamName: string;
  playerType: string;
}

export interface StateUpdateCallbacks {
  onSelectedPlayerChange?: (player: Player | null) => void;
  onSelectedPlayerTypeChange?: (type: string) => void;
}

/** Хранит выбор озвучки и типа плеера. */
export class PlayerSelectionManager {
  private lastSelectedTeamName: string = '';

  private lastSelectedPlayerType: string = '';

  private callbacks: StateUpdateCallbacks = {};

  /** Загружает сохранённый выбор. */
  constructor() {
    this.loadPreferences();
  }

  /**
   * Подписывает на изменения состояния
   */
  public subscribe(callbacks: StateUpdateCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Загружает настройки выбора плеера
   */
  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('playerPreferences');
      if (saved) {
        const prefs: PlayerPreferences = JSON.parse(saved);
        this.lastSelectedTeamName = prefs.teamName || '';
        this.lastSelectedPlayerType = prefs.playerType || '';
        log.debug('Loaded preferences:', prefs);
      }
    } catch (err) {
      log.error('Error loading preferences:', err);
    }
  }

  /**
   * Сохраняет настройки выбора плеера
   */
  public savePreference(teamName: string, playerType: string): void {
    this.lastSelectedTeamName = teamName;
    this.lastSelectedPlayerType = playerType;

    const prefs: PlayerPreferences = {
      teamName,
      playerType,
    };

    try {
      localStorage.setItem('playerPreferences', JSON.stringify(prefs));
      log.debug('Saved preferences:', prefs);
    } catch (err) {
      log.error('Error saving preferences:', err);
    }
  }

  /**
   * Возвращает последний выбор плеера
   */
  public getPreferences(): PlayerPreferences {
    return {
      teamName: this.lastSelectedTeamName,
      playerType: this.lastSelectedPlayerType,
    };
  }

  /**
   * Проверяет наличие сохранённого выбора
   */
  public hasPreferences(): boolean {
    return !!(this.lastSelectedTeamName && this.lastSelectedPlayerType);
  }

  /** Плеер по сохранённым предпочтениям; null — подходящего нет */
  public autoSelectPlayer(players: Player[]): Player | null {
    if (!this.hasPreferences() || players.length === 0) {
      return null;
    }

    const matched = players.find(
      (p) =>
        p.team.name === this.lastSelectedTeamName &&
        p.player === this.lastSelectedPlayerType,
    );

    if (matched) {
      log.debug('Auto-selected player:', matched.team.name, matched.player);
    }

    return matched || null;
  }

  /** Плеер по предпочтениям с запасными вариантами */
  public autoSelectPlayerOrFallback(players: Player[]): Player | null {
    if (players.length === 0) {
      return null;
    }

    if (this.hasPreferences()) {
      const preferredPlayer = this.autoSelectPlayer(players);
      if (preferredPlayer) {
        log.debug(
          'Selected from preferences:',
          preferredPlayer.team.name,
          preferredPlayer.player,
        );
        return preferredPlayer;
      }
    }

    const animelibPlayer = players.find(
      (p) => p.player === PLAYER_TYPE_ANIMELIB,
    );
    if (animelibPlayer) {
      log.debug(
        'No preferences, selected first Animelib:',
        animelibPlayer.team.name,
      );
      return animelibPlayer;
    }

    const kodikPlayer = players.find((p) => p.player === PLAYER_TYPE_KODIK);
    if (kodikPlayer) {
      log.debug('No AnimeLib, selected first Kodik:', kodikPlayer.team.name);
      return kodikPlayer;
    }

    const firstPlayer = players[0];
    log.debug(
      'Fallback to first player:',
      firstPlayer.team.name,
      firstPlayer.player,
    );
    return firstPlayer;
  }

  /**
   * Группирует плееры по типу
   */
  public static groupPlayersByType(
    players: Player[],
  ): Record<string, Player[]> {
    return players.reduce(
      (acc, player) => {
        if (!acc[player.player]) {
          acc[player.player] = [];
        }
        acc[player.player].push(player);
        return acc;
      },
      {} as Record<string, Player[]>,
    );
  }

  /**
   * Сортирует типы, помещая AnimeLib первым
   */
  public static getSortedPlayerTypes(
    groupedPlayers: Record<string, Player[]>,
  ): string[] {
    return Object.keys(groupedPlayers).sort((a, b) => {
      if (a === PLAYER_TYPE_ANIMELIB) return -1;
      if (b === PLAYER_TYPE_ANIMELIB) return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Выбирает тип плеера для отображения
   */
  public autoSelectPlayerType(
    groupedPlayers: Record<string, Player[]>,
    currentType: string,
  ): string {
    if (currentType && groupedPlayers[currentType]) {
      return currentType;
    }

    if (
      this.lastSelectedPlayerType &&
      groupedPlayers[this.lastSelectedPlayerType]
    ) {
      log.debug('Auto-selected player type:', this.lastSelectedPlayerType);
      return this.lastSelectedPlayerType;
    }

    const sortedTypes =
      PlayerSelectionManager.getSortedPlayerTypes(groupedPlayers);
    if (sortedTypes.length > 0) {
      log.debug('Auto-selected first player type:', sortedTypes[0]);
      return sortedTypes[0];
    }

    return '';
  }

  /**
   * Возвращает максимальное качество доступного источника
   */
  public static getMaxQuality(
    player: Player,
    offlineHeights: number[] = [],
  ): number {
    if (offlineHeights.length > 0) return Math.max(...offlineHeights);
    return (
      player.video?.quality?.reduce(
        (max, q) => (q.quality > max ? q.quality : max),
        0,
      ) || 0
    );
  }

  /**
   * Возвращает метку качества по разрешению
   */
  public static getQualityTag(quality: number): string {
    if (quality >= 2160) return '4K';
    if (quality >= 1440) return 'QHD';
    if (quality >= 1080) return 'FHD';
    if (quality >= 720) return 'HD';
    if (quality >= 480) return 'SD';
    return '';
  }

  /**
   * Проверяет, содержит ли плеер только субтитры без озвучки
   */
  public static isSubtitlesOnly(player: Player): boolean {
    return /суб|sub/i.test(player.translation_type?.label || '');
  }

  /**
   * Фильтрует плееры по подстроке в названии озвучки
   */
  public static filterPlayersByQuery(
    players: Player[],
    query: string,
  ): Player[] {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return players;
    }

    return players.filter((player) =>
      (player.team?.name || '').toLowerCase().includes(needle),
    );
  }

  /**
   * Сбрасывает сохранённый выбор
   */
  public clearPreferences(): void {
    this.lastSelectedTeamName = '';
    this.lastSelectedPlayerType = '';
    try {
      localStorage.removeItem('playerPreferences');
      log.debug('Cleared preferences');
    } catch (err) {
      log.error('Error clearing preferences:', err);
    }
  }
}
