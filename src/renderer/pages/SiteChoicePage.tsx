import React, { useState } from 'react';
import { Box, ButtonBase, Typography, useTheme } from '@mui/material';
import { LIB_SITES, LibSite, TOOLBAR_HEIGHT } from '../../constants';
import LibSiteIcon from '../components/sideRail/LibSiteIcon';
import MirrorStatusLabel from '../components/sideRail/MirrorStatusLabel';
import WindowControls from '../components/toolbar/WindowControls';
import useMirrorStatus from '../hooks/useMirrorStatus';
import { LIB_SITE_COLORS } from '../theme/palette';
import { mirrorHost, pickMirror, siteStatus } from '../utils/siteMirrors';

const ALL_MIRRORS = LIB_SITES.flatMap((site) => site.mirrors);

const sendWindowCommand = (
  command: 'window-minimize' | 'window-maximize' | 'window-close',
) => window.electron?.ipcRenderer?.sendMessage(command);

interface SiteChoicePageProps {
  onSubmit: (site: LibSite, mirror: string) => void;
}

/** Первый запуск: выбор базового сайта и его зеркала */
function SiteChoicePage({ onSubmit }: SiteChoicePageProps) {
  const { customColors } = useTheme().palette;
  const states = useMirrorStatus(ALL_MIRRORS);
  const [siteId, setSiteId] = useState<number>(LIB_SITES[0].siteId);
  const [picked, setPicked] = useState<Record<number, string>>({});

  const site = LIB_SITES.find((item) => item.siteId === siteId) ?? LIB_SITES[0];
  const mirrorOf = (item: LibSite) =>
    pickMirror(item.mirrors, states, picked[item.siteId] ?? null);
  const mirror = mirrorOf(site);
  const unreachable = states[mirror]?.status === 'fail';

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: customColors.pageColor,
      }}
    >
      <Box
        sx={{
          height: TOOLBAR_HEIGHT,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          px: 1,
          WebkitAppRegion: 'drag',
          appRegion: 'drag',
        }}
      >
        <WindowControls
          onMinimize={() => sendWindowCommand('window-minimize')}
          onMaximize={() => sendWindowCommand('window-maximize')}
          onClose={() => sendWindowCommand('window-close')}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
          p: 2,
        }}
      >
        <Box
          sx={{
            width: 440,
            maxWidth: '100%',
            p: 3.25,
            borderRadius: 3.5,
            backgroundColor: customColors.dialogColor,
            border: `1px solid ${customColors.lineColor}`,
          }}
        >
          <Typography
            sx={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: customColors.dialogTextColor,
            }}
          >
            Выбери базовый сайт
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              mb: 2.25,
              fontSize: '0.8125rem',
              color: customColors.mutedTextColor,
            }}
          >
            Сайт можно сменить в любой момент на панели слева
          </Typography>

          {LIB_SITES.map((item) => {
            const selected = item.siteId === siteId;
            const showMirrors = selected && item.mirrors.length > 1;
            const single = item.mirrors.length === 1;

            return (
              <Box key={item.siteId}>
                <ButtonBase
                  onClick={() => setSiteId(item.siteId)}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    gap: 1.5,
                    px: 1.5,
                    py: 1.25,
                    mb: 1,
                    borderRadius: 2.5,
                    border: `1px solid ${
                      selected
                        ? customColors.accentSoftColor
                        : customColors.lineColor
                    }`,
                    backgroundColor: selected
                      ? `rgba(${customColors.accentRgb}, 0.08)`
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.05)`,
                    },
                  }}
                >
                  <LibSiteIcon site={item} size={28} />
                  <Typography
                    sx={{
                      flex: 1,
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: customColors.dialogTextColor,
                    }}
                  >
                    {item.name}
                  </Typography>
                  <MirrorStatusLabel
                    state={
                      single
                        ? states[item.mirrors[0]]
                        : { status: siteStatus(item.mirrors, states) }
                    }
                    okText="доступен"
                    failText="недоступен"
                  />
                </ButtonBase>

                {showMirrors && (
                  <Box
                    sx={{
                      mt: -0.25,
                      mb: 1.25,
                      ml: 5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                    }}
                  >
                    {item.mirrors.map((home) => {
                      const current = home === mirrorOf(item);
                      const failed = states[home]?.status === 'fail';
                      return (
                        <ButtonBase
                          key={home}
                          onClick={() =>
                            setPicked((prev) => ({
                              ...prev,
                              [item.siteId]: home,
                            }))
                          }
                          sx={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            gap: 1.25,
                            px: 1.25,
                            py: 0.75,
                            borderRadius: 2,
                            fontSize: '0.8125rem',
                            color: customColors.dialogTextColor,
                            opacity: failed && !current ? 0.45 : 1,
                            backgroundColor: current
                              ? customColors.mutedColor
                              : 'transparent',
                          }}
                        >
                          <Box
                            sx={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              border: `2px solid ${
                                current
                                  ? customColors.accentSoftColor
                                  : customColors.mutedTextColor
                              }`,
                              backgroundColor: current
                                ? customColors.accentSoftColor
                                : 'transparent',
                              boxShadow: current
                                ? `inset 0 0 0 2px ${customColors.dialogColor}`
                                : 'none',
                            }}
                          />
                          {mirrorHost(home)}
                          <Box sx={{ ml: 'auto' }}>
                            <MirrorStatusLabel
                              state={states[home]}
                              failText="не отвечает"
                            />
                          </Box>
                        </ButtonBase>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}

          <ButtonBase
            onClick={() => onSubmit(site, mirror)}
            sx={{
              mt: 1.5,
              width: '100%',
              py: 1.375,
              borderRadius: 2.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: customColors.whiteColor,
              backgroundColor: LIB_SITE_COLORS[site.siteId],
              '&:hover': { filter: 'brightness(1.08)' },
            }}
          >
            Открыть {site.name}
          </ButtonBase>

          {unreachable && (
            <Typography
              sx={{
                mt: 1.25,
                fontSize: '0.75rem',
                textAlign: 'center',
                color: customColors.warningColor,
              }}
            >
              {mirrorHost(mirror)} сейчас не отвечает — возможно, сайт
              заблокирован
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default SiteChoicePage;
