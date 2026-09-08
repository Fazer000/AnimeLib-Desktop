import { styled } from '@mui/material/styles';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown as LucideArrowDown,
  ArrowDownToLine as LucideArrowDownToLine,
  ArrowLeft as LucideArrowLeft,
  ArrowUp as LucideArrowUp,
  AudioLines as LucideAudioLines,
  Bold as LucideBold,
  Bookmark as LucideBookmark,
  Bug as LucideBug,
  Captions as LucideCaptions,
  Check as LucideCheck,
  CheckCheck as LucideCheckCheck,
  ChevronDown as LucideChevronDown,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  ChevronsRight as LucideChevronsRight,
  CloudDownload as LucideCloudDownload,
  CloudOff as LucideCloudOff,
  Download as LucideDownload,
  Ellipsis as LucideEllipsis,
  ExternalLink as LucideExternalLink,
  Eye as LucideEye,
  FastForward as LucideFastForward,
  FolderOpen as LucideFolderOpen,
  Gauge as LucideGauge,
  House as LucideHouse,
  Italic as LucideItalic,
  Keyboard as LucideKeyboard,
  Library as LucideLibrary,
  Link as LucideLink,
  ListVideo as LucideListVideo,
  Maximize as LucideMaximize,
  Minimize as LucideMinimize,
  Minus as LucideMinus,
  Pause as LucidePause,
  Pencil as LucidePencil,
  PictureInPicture2 as LucidePictureInPicture2,
  Play as LucidePlay,
  Quote as LucideQuote,
  RotateCw as LucideRotateCw,
  Search as LucideSearch,
  SearchX as LucideSearchX,
  Send as LucideSend,
  Settings as LucideSettings,
  SkipForward as LucideSkipForward,
  SlidersHorizontal as LucideSlidersHorizontal,
  Star as LucideStar,
  Strikethrough as LucideStrikethrough,
  Trash2 as LucideTrash2,
  Underline as LucideUnderline,
  UserX as LucideUserX,
  Volume as LucideVolume,
  Volume1 as LucideVolume1,
  Volume2 as LucideVolume2,
  VolumeX as LucideVolumeX,
  X as LucideX,
} from 'lucide-react';
import { ICON_STROKE_WIDTH } from '../../constants';

/**
 * Приводит контурный значок к поведению значков MUI:
 * размер задаётся кеглем, цвет наследуется, толщина штриха общая
 */
const adapt = (Icon: LucideIcon) =>
  styled(Icon)({
    width: '1em',
    height: '1em',
    fontSize: '1.5rem',
    strokeWidth: ICON_STROKE_WIDTH,
    flexShrink: 0,
  });

export const ArrowDown = adapt(LucideArrowDown);
export const ArrowDownToLine = adapt(LucideArrowDownToLine);
export const ArrowLeft = adapt(LucideArrowLeft);
export const ArrowUp = adapt(LucideArrowUp);
export const AudioLines = adapt(LucideAudioLines);
export const Bold = adapt(LucideBold);
export const Bookmark = adapt(LucideBookmark);
export const Bug = adapt(LucideBug);
export const Captions = adapt(LucideCaptions);
export const Check = adapt(LucideCheck);
export const CheckCheck = adapt(LucideCheckCheck);
export const ChevronDown = adapt(LucideChevronDown);
export const ChevronLeft = adapt(LucideChevronLeft);
export const ChevronRight = adapt(LucideChevronRight);
export const ChevronUp = adapt(LucideChevronUp);
export const ChevronsRight = adapt(LucideChevronsRight);
export const CloudDownload = adapt(LucideCloudDownload);
export const CloudOff = adapt(LucideCloudOff);
export const Download = adapt(LucideDownload);
export const Ellipsis = adapt(LucideEllipsis);
export const ExternalLink = adapt(LucideExternalLink);
export const Eye = adapt(LucideEye);
export const FastForward = adapt(LucideFastForward);
export const FolderOpen = adapt(LucideFolderOpen);
export const Gauge = adapt(LucideGauge);
export const House = adapt(LucideHouse);
export const Italic = adapt(LucideItalic);
export const Keyboard = adapt(LucideKeyboard);
export const Library = adapt(LucideLibrary);
export const LinkIcon = adapt(LucideLink);
export const ListVideo = adapt(LucideListVideo);
export const Maximize = adapt(LucideMaximize);
export const Minimize = adapt(LucideMinimize);
export const Minus = adapt(LucideMinus);
export const Pause = adapt(LucidePause);
export const Pencil = adapt(LucidePencil);
export const PictureInPicture2 = adapt(LucidePictureInPicture2);
export const Play = adapt(LucidePlay);
export const Quote = adapt(LucideQuote);
export const RotateCw = adapt(LucideRotateCw);
export const Search = adapt(LucideSearch);
export const SearchX = adapt(LucideSearchX);
export const Send = adapt(LucideSend);
export const Settings = adapt(LucideSettings);
export const SkipForward = adapt(LucideSkipForward);
export const SlidersHorizontal = adapt(LucideSlidersHorizontal);
export const Star = adapt(LucideStar);
export const Strikethrough = adapt(LucideStrikethrough);
export const Trash2 = adapt(LucideTrash2);
export const Underline = adapt(LucideUnderline);
export const UserX = adapt(LucideUserX);
export const Volume = adapt(LucideVolume);
export const Volume1 = adapt(LucideVolume1);
export const Volume2 = adapt(LucideVolume2);
export const VolumeX = adapt(LucideVolumeX);
export const X = adapt(LucideX);
