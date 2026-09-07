import { Theme, createTheme } from '@mui/material';
import {
  BLACK,
  DANGER_DARK_RGB,
  DANGER_DEEP,
  DANGER_RGB,
  DANGER_SOFT,
  DANGER_SOFT_RGB,
  DANGER_STRONG,
  DARK_ALPHA_SURFACE,
  DARK_ERROR,
  DARK_ON_SURFACE,
  DARK_ON_SURFACE_DISABLED,
  DARK_ON_SURFACE_MUTED,
  DARK_ON_SURFACE_RGB,
  DARK_ON_SURFACE_VARIANT,
  DARK_OUTLINE,
  DARK_OUTLINE_VARIANT,
  DARK_PRIMARY,
  DARK_PRIMARY_ACCENT,
  DARK_PRIMARY_QUIET,
  DARK_SUCCESS,
  DARK_SURFACE,
  DARK_SURFACE_CONTAINER,
  DARK_SURFACE_CONTAINER_HIGH,
  DARK_SURFACE_CONTAINER_HIGHEST,
  DARK_SURFACE_CONTAINER_HIGHEST_RGB,
  DARK_SURFACE_CONTAINER_RGB,
  DARK_SURFACE_RGB,
  DARK_TEXT_ACCENT,
  INFO,
  LIGHT_ALPHA_SURFACE,
  LIGHT_ERROR,
  LIGHT_ON_SURFACE,
  LIGHT_ON_SURFACE_DISABLED,
  LIGHT_ON_SURFACE_MUTED,
  LIGHT_ON_SURFACE_RGB,
  LIGHT_ON_SURFACE_VARIANT,
  LIGHT_OUTLINE,
  LIGHT_OUTLINE_VARIANT,
  LIGHT_OVERLAY_RGB,
  LIGHT_PRIMARY,
  LIGHT_PRIMARY_ACCENT,
  LIGHT_PRIMARY_QUIET,
  LIGHT_QUALITY_HD,
  LIGHT_SUCCESS,
  LIGHT_SURFACE,
  LIGHT_SURFACE_CONTAINER,
  LIGHT_SURFACE_CONTAINER_HIGH,
  LIGHT_SURFACE_CONTAINER_HIGHEST,
  LIGHT_SURFACE_CONTAINER_HIGHEST_RGB,
  LILAC_TINT,
  LILAC_TINT_RGB,
  NEUTRAL_RGB,
  OFF_WHITE,
  PRIMARY_DEEP,
  PRIMARY_RGB,
  SUCCESS_DARK_RGB,
  SUCCESS_RGB,
  SURFACE_HEADER,
  WARNING,
  WARNING_DARK,
  WARNING_ORANGE,
  WHITE,
} from './palette';
import { ColorSchemeName } from './themeMode';

declare module '@mui/material/styles' {
  interface CustomColors {
    primaryColor: string;
    secondaryColor: string;
    blueColor: string;
    alphaPrimaryColor: string;
    borderColor: string;
    alphaBorderColor: string;
    lineColor: string;
    headerColor: string;
    siteHeaderColor: string;
    primaryTextColor: string;
    secondaryTextColor: string;
    accentTextColor: string;
    dialogColor: string;
    raisedColor: string;
    footerColor: string;
    pageColor: string;
    panelColor: string;
    elevatedSurfaceColor: string;
    mutedColor: string;
    mutedTextColor: string;
    dialogTextColor: string;
    accentSoftColor: string;
    accentHoverColor: string;
    accentQuietColor: string;
    onAccentColor: string;
    onVideoColor: string;
    onVideoAccentColor: string;
    onVideoMutedColor: string;
    onVideoSurfaceRgb: string;
    onVideoElevatedRgb: string;
    dangerColor: string;
    dangerHoverColor: string;
    dangerSoftColor: string;
    successColor: string;
    warningColor: string;

    onSurfaceRgb: string;
    overlayRgb: string;
    headerRgb: string;
    elevatedRgb: string;
    accentRgb: string;
    dangerRgb: string;
    dangerSoftRgb: string;
    successRgb: string;
    neutralRgb: string;

    whiteColor: string;
    grayColor: string;
    blackColor: string;
    bookmarkColor: string;
  }

  interface Palette {
    customColors: CustomColors;
  }

  interface PaletteOptions {
    customColors?: CustomColors;
  }
}

const SHARED = {
  accentRgb: PRIMARY_RGB,
  neutralRgb: NEUTRAL_RGB,
  onAccentColor: WHITE,
  onVideoColor: DARK_ON_SURFACE,
  onVideoAccentColor: DARK_PRIMARY_ACCENT,
  onVideoMutedColor: DARK_TEXT_ACCENT,
  onVideoSurfaceRgb: DARK_SURFACE_RGB,
  onVideoElevatedRgb: DARK_SURFACE_CONTAINER_HIGHEST_RGB,
  whiteColor: WHITE,
  grayColor: OFF_WHITE,
  blackColor: BLACK,
  bookmarkColor: WARNING_ORANGE,
};

const DARK_COLORS = {
  primaryColor: DARK_SURFACE_CONTAINER,
  secondaryColor: DARK_PRIMARY,
  blueColor: INFO,
  alphaPrimaryColor: DARK_ALPHA_SURFACE,
  borderColor: DARK_OUTLINE,
  alphaBorderColor: DARK_OUTLINE_VARIANT,
  lineColor: DARK_OUTLINE_VARIANT,
  headerColor: DARK_SURFACE_CONTAINER,
  siteHeaderColor: SURFACE_HEADER,
  primaryTextColor: DARK_ON_SURFACE,
  secondaryTextColor: DARK_PRIMARY_ACCENT,
  accentTextColor: DARK_ON_SURFACE_VARIANT,
  dialogColor: DARK_SURFACE_CONTAINER,
  raisedColor: DARK_SURFACE_CONTAINER_HIGH,
  footerColor: DARK_SURFACE_CONTAINER_HIGHEST,
  pageColor: DARK_SURFACE,
  panelColor: DARK_SURFACE_CONTAINER,
  elevatedSurfaceColor: DARK_SURFACE_CONTAINER_HIGHEST,
  mutedColor: DARK_SURFACE_CONTAINER_HIGH,
  mutedTextColor: DARK_ON_SURFACE_MUTED,
  dialogTextColor: DARK_ON_SURFACE,
  accentSoftColor: DARK_PRIMARY_ACCENT,
  accentHoverColor: PRIMARY_DEEP,
  accentQuietColor: DARK_PRIMARY_QUIET,
  dangerColor: DARK_ERROR,
  dangerHoverColor: DANGER_STRONG,
  dangerSoftColor: DANGER_SOFT,
  successColor: DARK_SUCCESS,
  warningColor: WARNING,
  dangerRgb: DANGER_RGB,
  dangerSoftRgb: DANGER_SOFT_RGB,
  successRgb: SUCCESS_RGB,
  onSurfaceRgb: DARK_ON_SURFACE_RGB,
  overlayRgb: DARK_SURFACE_RGB,
  headerRgb: DARK_SURFACE_CONTAINER_RGB,
  elevatedRgb: DARK_SURFACE_CONTAINER_HIGHEST_RGB,
  ...SHARED,
};

const LIGHT_COLORS = {
  primaryColor: LIGHT_SURFACE_CONTAINER,
  secondaryColor: LIGHT_PRIMARY,
  blueColor: LIGHT_QUALITY_HD,
  alphaPrimaryColor: LIGHT_ALPHA_SURFACE,
  borderColor: LIGHT_OUTLINE,
  alphaBorderColor: LIGHT_OUTLINE_VARIANT,
  lineColor: LIGHT_OUTLINE_VARIANT,
  headerColor: LILAC_TINT,
  siteHeaderColor: LILAC_TINT,
  primaryTextColor: LIGHT_ON_SURFACE,
  secondaryTextColor: LIGHT_PRIMARY,
  accentTextColor: LIGHT_ON_SURFACE_VARIANT,
  dialogColor: LIGHT_SURFACE_CONTAINER,
  raisedColor: LIGHT_SURFACE_CONTAINER_HIGH,
  footerColor: LIGHT_SURFACE_CONTAINER_HIGH,
  pageColor: LIGHT_SURFACE,
  panelColor: LIGHT_SURFACE_CONTAINER,
  elevatedSurfaceColor: LIGHT_SURFACE_CONTAINER_HIGHEST,
  mutedColor: LIGHT_SURFACE_CONTAINER_HIGH,
  mutedTextColor: LIGHT_ON_SURFACE_MUTED,
  dialogTextColor: LIGHT_ON_SURFACE,
  accentSoftColor: LIGHT_PRIMARY_ACCENT,
  accentHoverColor: PRIMARY_DEEP,
  accentQuietColor: LIGHT_PRIMARY_QUIET,
  dangerColor: LIGHT_ERROR,
  dangerHoverColor: DANGER_DEEP,
  dangerSoftColor: LIGHT_ERROR,
  successColor: LIGHT_SUCCESS,
  warningColor: WARNING_DARK,
  dangerRgb: DANGER_DARK_RGB,
  dangerSoftRgb: DANGER_DARK_RGB,
  successRgb: SUCCESS_DARK_RGB,
  onSurfaceRgb: LIGHT_ON_SURFACE_RGB,
  overlayRgb: LIGHT_OVERLAY_RGB,
  headerRgb: LILAC_TINT_RGB,
  elevatedRgb: LIGHT_SURFACE_CONTAINER_HIGHEST_RGB,
  ...SHARED,
};

const DARK_BASE = {
  surface: DARK_SURFACE_CONTAINER,
  surfaceLight: DARK_SURFACE_CONTAINER_HIGH,
  surfaceDark: DARK_SURFACE,
  onSurface: DARK_ON_SURFACE,
  background: DARK_SURFACE,
  paper: DARK_SURFACE_CONTAINER,
  text: DARK_ON_SURFACE,
  textDisabled: DARK_ON_SURFACE_DISABLED,
  divider: DARK_OUTLINE,
};

const LIGHT_BASE = {
  surface: LIGHT_SURFACE_CONTAINER,
  surfaceLight: LIGHT_SURFACE,
  surfaceDark: LIGHT_SURFACE_CONTAINER_HIGH,
  onSurface: LIGHT_ON_SURFACE,
  background: LIGHT_SURFACE,
  paper: LIGHT_SURFACE_CONTAINER,
  text: LIGHT_ON_SURFACE,
  textDisabled: LIGHT_ON_SURFACE_DISABLED,
  divider: LIGHT_OUTLINE,
};

/** Возвращает набор ролей для схемы. */
export function getSchemeColors(scheme: ColorSchemeName) {
  return scheme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

/** Собирает тему приложения под выбранную цветовую схему. */
export function createAppTheme(scheme: ColorSchemeName): Theme {
  const base = scheme === 'light' ? LIGHT_BASE : DARK_BASE;
  const customColors = getSchemeColors(scheme);

  return createTheme({
    typography: {
      fontFamily: '"Open Sans", sans-serif',
      h1: { fontWeight: 600 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: {
      borderRadius: 8,
    },
    palette: {
      mode: scheme,
      primary: {
        main: base.surface,
        light: base.surfaceLight,
        dark: base.surfaceDark,
        contrastText: base.onSurface,
      },
      secondary: {
        main: DARK_PRIMARY,
        light: DARK_PRIMARY_ACCENT,
        dark: PRIMARY_DEEP,
        contrastText: WHITE,
      },
      background: {
        default: base.background,
        paper: base.paper,
      },
      text: {
        primary: base.text,
        secondary: customColors.secondaryTextColor,
        disabled: base.textDisabled,
      },
      divider: base.divider,
      customColors,
    },
    components: {
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: '32px !important',
            height: '32px !important',
            paddingLeft: '8px !important',
            paddingRight: '8px !important',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: `${customColors.headerColor} !important`,
            boxShadow: 'none !important',
            border: 'none !important',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          rounded: {
            borderRadius: 8,
          },
        },
      },
    },
  });
}

export default createAppTheme;
