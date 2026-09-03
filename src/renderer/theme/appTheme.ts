import { Theme, createTheme } from '@mui/material';
import {
  ACCENT,
  ACCENT_DEEPEST,
  ACCENT_LIGHT,
  ACCENT_RGB,
  ACCENT_LIGHT_ALT,
  BLACK,
  BORDER,
  BORDER_LIGHT,
  DANGER_RGB,
  DARK_ALPHA_BORDER,
  DARK_ALPHA_SURFACE,
  DARK_ELEVATED_RGB,
  DARK_ON_SURFACE_RGB,
  DARK_OVERLAY_RGB,
  DARK_TEXT_ACCENT,
  DARK_TEXT_DISABLED,
  INFO,
  INFO_DEEP,
  LIGHT_ALPHA_BORDER,
  LIGHT_ALPHA_SURFACE,
  LIGHT_ELEVATED_RGB,
  LIGHT_ON_SURFACE_RGB,
  LIGHT_OVERLAY_RGB,
  LIGHT_SURFACE,
  LIGHT_TEXT_DISABLED,
  LILAC_TINT,
  OFF_WHITE,
  NEUTRAL_RGB,
  SURFACE,
  LIGHT_SURFACE_CONTAINER_HIGH,
  SURFACE_DEEPEST,
  SURFACE_DIALOG,
  SURFACE_HEADER,
  SURFACE_HOVER,
  SURFACE_RAISED,
  TEXT_DIM,
  TEXT_ON_LIGHT,
  TEXT_ON_LIGHT_MUTED,
  TEXT_PRIMARY,
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
    primaryTextColor: string;
    secondaryTextColor: string;
    accentTextColor: string;
    dialogColor: string;
    raisedColor: string;
    dialogTextColor: string;
    accentSoftColor: string;

    onSurfaceRgb: string;
    overlayRgb: string;
    elevatedRgb: string;
    accentRgb: string;
    dangerRgb: string;
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
  accentRgb: ACCENT_RGB,
  dangerRgb: DANGER_RGB,
  neutralRgb: NEUTRAL_RGB,
  whiteColor: WHITE,
  grayColor: OFF_WHITE,
  blackColor: BLACK,
  bookmarkColor: WARNING_ORANGE,
};

const DARK_COLORS = {
  primaryColor: SURFACE,
  secondaryColor: ACCENT,
  blueColor: INFO,
  alphaPrimaryColor: DARK_ALPHA_SURFACE,
  borderColor: BORDER,
  alphaBorderColor: DARK_ALPHA_BORDER,
  lineColor: BORDER,
  headerColor: SURFACE_HEADER,
  primaryTextColor: TEXT_PRIMARY,
  secondaryTextColor: ACCENT,
  accentTextColor: DARK_TEXT_ACCENT,
  dialogColor: SURFACE_DIALOG,
  raisedColor: SURFACE_RAISED,
  dialogTextColor: WHITE,
  accentSoftColor: ACCENT_LIGHT,
  onSurfaceRgb: DARK_ON_SURFACE_RGB,
  overlayRgb: DARK_OVERLAY_RGB,
  elevatedRgb: DARK_ELEVATED_RGB,
  ...SHARED,
};

const LIGHT_COLORS = {
  primaryColor: WHITE,
  secondaryColor: ACCENT,
  blueColor: INFO_DEEP,
  alphaPrimaryColor: LIGHT_ALPHA_SURFACE,
  borderColor: BORDER_LIGHT,
  alphaBorderColor: LIGHT_ALPHA_BORDER,
  lineColor: TEXT_DIM,
  headerColor: LILAC_TINT,
  primaryTextColor: TEXT_ON_LIGHT,
  secondaryTextColor: ACCENT,
  accentTextColor: TEXT_ON_LIGHT_MUTED,
  dialogColor: WHITE,
  raisedColor: LIGHT_SURFACE_CONTAINER_HIGH,
  dialogTextColor: TEXT_ON_LIGHT,
  accentSoftColor: ACCENT,
  onSurfaceRgb: LIGHT_ON_SURFACE_RGB,
  overlayRgb: LIGHT_OVERLAY_RGB,
  elevatedRgb: LIGHT_ELEVATED_RGB,
  ...SHARED,
};

const DARK_BASE = {
  surface: SURFACE,
  surfaceLight: SURFACE_HOVER,
  surfaceDark: SURFACE_DEEPEST,
  onSurface: WHITE,
  background: SURFACE,
  paper: SURFACE_HEADER,
  text: TEXT_PRIMARY,
  textDisabled: DARK_TEXT_DISABLED,
  divider: BORDER,
};

const LIGHT_BASE = {
  surface: WHITE,
  surfaceLight: LIGHT_SURFACE,
  surfaceDark: BORDER_LIGHT,
  onSurface: TEXT_ON_LIGHT,
  background: LIGHT_SURFACE,
  paper: WHITE,
  text: TEXT_ON_LIGHT,
  textDisabled: LIGHT_TEXT_DISABLED,
  divider: BORDER_LIGHT,
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
        main: ACCENT,
        light: ACCENT_LIGHT_ALT,
        dark: ACCENT_DEEPEST,
        contrastText: WHITE,
      },
      background: {
        default: base.background,
        paper: base.paper,
      },
      text: {
        primary: base.text,
        secondary: ACCENT,
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
