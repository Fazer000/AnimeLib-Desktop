/**
 * Две цветовые схемы приложения, собранные из именованных цветов палитры.
 * Роли одинаковы в обеих, поэтому компоненты обращаются к роли, а не к оттенку.
 */
import {
  ACCENT_VIOLET,
  DARK_ERROR,
  DARK_ERROR_CONTAINER,
  DARK_ON_SURFACE,
  DARK_ON_SURFACE_DISABLED,
  DARK_ON_SURFACE_MUTED,
  DARK_ON_SURFACE_VARIANT,
  DARK_OUTLINE,
  DARK_OUTLINE_VARIANT,
  DARK_PRIMARY,
  DARK_PRIMARY_ACCENT,
  DARK_PRIMARY_CONTAINER,
  DARK_PRIMARY_QUIET,
  DARK_SUCCESS,
  DARK_SURFACE,
  DARK_SURFACE_CONTAINER,
  DARK_SURFACE_CONTAINER_HIGH,
  DARK_SURFACE_CONTAINER_HIGHEST,
  DARK_SURFACE_VIDEO,
  INFO_BRIGHT,
  LIGHT_ERROR,
  LIGHT_ERROR_CONTAINER,
  LIGHT_ON_SURFACE,
  LIGHT_ON_SURFACE_DISABLED,
  LIGHT_ON_SURFACE_MUTED,
  LIGHT_ON_SURFACE_VARIANT,
  LIGHT_OUTLINE,
  LIGHT_OUTLINE_VARIANT,
  LIGHT_PRIMARY,
  LIGHT_PRIMARY_ACCENT,
  LIGHT_PRIMARY_CONTAINER,
  LIGHT_PRIMARY_QUIET,
  LIGHT_QUALITY_4K,
  LIGHT_QUALITY_FHD,
  LIGHT_QUALITY_HD,
  LIGHT_QUALITY_SD,
  LIGHT_SUCCESS,
  LIGHT_SURFACE,
  LIGHT_SURFACE_CONTAINER,
  LIGHT_SURFACE_CONTAINER_HIGH,
  LIGHT_SURFACE_CONTAINER_HIGHEST,
  LIGHT_SURFACE_VIDEO,
  QUALITY_4K,
  QUALITY_SD,
} from './palette';

/** Набор ролей, который обязана заполнить каждая схема. */
export interface ColorScheme {
  surfaceVideo: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  onSurfaceMuted: string;
  onSurfaceDisabled: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  primaryAccent: string;
  primaryContainer: string;
  primaryQuiet: string;
  error: string;
  errorContainer: string;
  success: string;
  quality4k: string;
  qualityFhd: string;
  qualityHd: string;
  qualitySd: string;
}

/** Тёмная схема — основная для приложения. */
export const DARK_SCHEME: ColorScheme = {
  surfaceVideo: DARK_SURFACE_VIDEO,
  surface: DARK_SURFACE,
  surfaceContainer: DARK_SURFACE_CONTAINER,
  surfaceContainerHigh: DARK_SURFACE_CONTAINER_HIGH,
  surfaceContainerHighest: DARK_SURFACE_CONTAINER_HIGHEST,
  onSurface: DARK_ON_SURFACE,
  onSurfaceVariant: DARK_ON_SURFACE_VARIANT,
  onSurfaceMuted: DARK_ON_SURFACE_MUTED,
  onSurfaceDisabled: DARK_ON_SURFACE_DISABLED,
  outline: DARK_OUTLINE,
  outlineVariant: DARK_OUTLINE_VARIANT,
  primary: DARK_PRIMARY,
  primaryAccent: DARK_PRIMARY_ACCENT,
  primaryContainer: DARK_PRIMARY_CONTAINER,
  primaryQuiet: DARK_PRIMARY_QUIET,
  error: DARK_ERROR,
  errorContainer: DARK_ERROR_CONTAINER,
  success: DARK_SUCCESS,
  quality4k: QUALITY_4K,
  qualityFhd: ACCENT_VIOLET,
  qualityHd: INFO_BRIGHT,
  qualitySd: QUALITY_SD,
};

/** Светлая схема, синхронизируемая с темой сайта. */
export const LIGHT_SCHEME: ColorScheme = {
  surfaceVideo: LIGHT_SURFACE_VIDEO,
  surface: LIGHT_SURFACE,
  surfaceContainer: LIGHT_SURFACE_CONTAINER,
  surfaceContainerHigh: LIGHT_SURFACE_CONTAINER_HIGH,
  surfaceContainerHighest: LIGHT_SURFACE_CONTAINER_HIGHEST,
  onSurface: LIGHT_ON_SURFACE,
  onSurfaceVariant: LIGHT_ON_SURFACE_VARIANT,
  onSurfaceMuted: LIGHT_ON_SURFACE_MUTED,
  onSurfaceDisabled: LIGHT_ON_SURFACE_DISABLED,
  outline: LIGHT_OUTLINE,
  outlineVariant: LIGHT_OUTLINE_VARIANT,
  primary: LIGHT_PRIMARY,
  primaryAccent: LIGHT_PRIMARY_ACCENT,
  primaryContainer: LIGHT_PRIMARY_CONTAINER,
  primaryQuiet: LIGHT_PRIMARY_QUIET,
  error: LIGHT_ERROR,
  errorContainer: LIGHT_ERROR_CONTAINER,
  success: LIGHT_SUCCESS,
  quality4k: LIGHT_QUALITY_4K,
  qualityFhd: LIGHT_QUALITY_FHD,
  qualityHd: LIGHT_QUALITY_HD,
  qualitySd: LIGHT_QUALITY_SD,
};

export default DARK_SCHEME;
