/* eslint-disable no-console */
/**
 * PlayerSelectionManager - Manages player selection, user preferences, and auto-selection logic
 *
 * Responsibilities:
 * - Tracks and persists user's last selected team and player type
 * - Provides auto-selection logic based on preferences
 * - Groups players by type
 * - Manages player type selection
 *
 * @example
 * ```typescript
 * const manager = new PlayerSelectionManager();
 *
 * // Save user preference
 * manager.savePreference('Anilibria', 'AnimeLib');
 *
 * // Get auto-selected player
 * const player = manager.autoSelectPlayer(players);
 *
 * // Group players by type
 * const grouped = manager.groupPlayersByType(players);
 * ```
 */

import { Player } from '../../api/animeApi';

export interface PlayerPreferences {
  teamName: string;
  playerType: string;
}

export interface StateUpdateCallbacks {
  onSelectedPlayerChange?: (player: Player | null) => void;
  onSelectedPlayerTypeChange?: (type: string) => void;
}

export class PlayerSelectionManager {
  private lastSelectedTeamName: string = '';

  private lastSelectedPlayerType: string = '';

  private callbacks: StateUpdateCallbacks = {};

  constructor() {
    this.loadPreferences();
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(callbacks: StateUpdateCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Load user preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('playerPreferences');
      if (saved) {
        const prefs: PlayerPreferences = JSON.parse(saved);
        this.lastSelectedTeamName = prefs.teamName || '';
        this.lastSelectedPlayerType = prefs.playerType || '';
        console.log('[PlayerSelectionManager] Loaded preferences:', prefs);
      }
    } catch (err) {
      console.error('[PlayerSelectionManager] Error loading preferences:', err);
    }
  }

  /**
   * Save user preferences to localStorage
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
      console.log('[PlayerSelectionManager] Saved preferences:', prefs);
    } catch (err) {
      console.error('[PlayerSelectionManager] Error saving preferences:', err);
    }
  }

  /**
   * Get last selected preferences
   */
  public getPreferences(): PlayerPreferences {
    return {
      teamName: this.lastSelectedTeamName,
      playerType: this.lastSelectedPlayerType,
    };
  }

  /**
   * Check if user has saved preferences
   */
  public hasPreferences(): boolean {
    return !!(this.lastSelectedTeamName && this.lastSelectedPlayerType);
  }

  /**
   * Auto-select player based on saved preferences
   * Returns null if no matching player found
   */
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
      console.log(
        '[PlayerSelectionManager] Auto-selected player:',
        matched.team.name,
        matched.player,
      );
    }

    return matched || null;
  }

  /**
   * Auto-select player with fallback logic:
   * 1. Try to select from saved preferences
   * 2. If no preferences, select first from AnimeLib
   * 3. If no AnimeLib players, select first from Kodik
   * 4. If no Kodik, select any first player
   */
  public autoSelectPlayerOrFallback(players: Player[]): Player | null {
    if (players.length === 0) {
      return null;
    }

    // 1. Try saved preferences first
    if (this.hasPreferences()) {
      const preferredPlayer = this.autoSelectPlayer(players);
      if (preferredPlayer) {
        console.log(
          '[PlayerSelectionManager] Selected from preferences:',
          preferredPlayer.team.name,
          preferredPlayer.player,
        );
        return preferredPlayer;
      }
    }

    // 2. Try AnimeLib first
    const animelibPlayer = players.find((p) => p.player === 'AnimeLib');
    if (animelibPlayer) {
      console.log(
        '[PlayerSelectionManager] No preferences, selected first AnimeLib:',
        animelibPlayer.team.name,
      );
      return animelibPlayer;
    }

    // 3. Try Kodik second
    const kodikPlayer = players.find((p) => p.player === 'Kodik');
    if (kodikPlayer) {
      console.log(
        '[PlayerSelectionManager] No AnimeLib, selected first Kodik:',
        kodikPlayer.team.name,
      );
      return kodikPlayer;
    }

    // 4. Fallback to first available player
    const firstPlayer = players[0];
    console.log(
      '[PlayerSelectionManager] Fallback to first player:',
      firstPlayer.team.name,
      firstPlayer.player,
    );
    return firstPlayer;
  }

  /**
   * Group players by type (AnimeLib, Kodik, etc.)
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
   * Get sorted player types (AnimeLib first, then alphabetically)
   */
  public static getSortedPlayerTypes(
    groupedPlayers: Record<string, Player[]>,
  ): string[] {
    return Object.keys(groupedPlayers).sort((a, b) => {
      if (a === 'AnimeLib') return -1;
      if (b === 'AnimeLib') return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Auto-select player type for display
   */
  public autoSelectPlayerType(
    groupedPlayers: Record<string, Player[]>,
    currentType: string,
  ): string {
    // If already selected, keep it
    if (currentType && groupedPlayers[currentType]) {
      return currentType;
    }

    // If has saved preference and it exists, use it
    if (
      this.lastSelectedPlayerType &&
      groupedPlayers[this.lastSelectedPlayerType]
    ) {
      console.log(
        '[PlayerSelectionManager] Auto-selected player type:',
        this.lastSelectedPlayerType,
      );
      return this.lastSelectedPlayerType;
    }

    // Otherwise, select first available (sorted)
    const sortedTypes =
      PlayerSelectionManager.getSortedPlayerTypes(groupedPlayers);
    if (sortedTypes.length > 0) {
      console.log(
        '[PlayerSelectionManager] Auto-selected first player type:',
        sortedTypes[0],
      );
      return sortedTypes[0];
    }

    return '';
  }

  /**
   * Get max quality for a player
   */
  public static getMaxQuality(player: Player): number {
    return (
      player.video?.quality?.reduce(
        (max, q) => (q.quality > max ? q.quality : max),
        0,
      ) || 0
    );
  }

  /**
   * Get quality tag (4K, FHD, HD, SD) based on resolution
   */
  public static getQualityTag(quality: number): string {
    if (quality >= 2160) return '4K';
    if (quality >= 1080) return 'FHD';
    if (quality >= 720) return 'HD';
    if (quality >= 480) return 'SD';
    return '';
  }

  /**
   * Clear all preferences
   */
  public clearPreferences(): void {
    this.lastSelectedTeamName = '';
    this.lastSelectedPlayerType = '';
    try {
      localStorage.removeItem('playerPreferences');
      console.log('[PlayerSelectionManager] Cleared preferences');
    } catch (err) {
      console.error(
        '[PlayerSelectionManager] Error clearing preferences:',
        err,
      );
    }
  }
}
