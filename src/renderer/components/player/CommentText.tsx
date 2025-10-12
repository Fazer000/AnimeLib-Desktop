import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

interface CommentTextProps {
  html: string;
}

/**
 * CommentText - Renders formatted comment HTML with proper styling
 *
 * Supports:
 * - Blockquotes (цитаты)
 * - Spoilers (спойлеры)
 * - Bold, Italic, Underline, Strikethrough
 * - Line breaks
 */
function CommentText({ html }: CommentTextProps) {
  const theme = useTheme();
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(
    new Set(),
  );

  /**
   * Parse HTML and render with proper styling
   */
  const parseHTML = useCallback(
    (htmlString: string): React.ReactNode[] => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const elements: React.ReactNode[] = [];
      let key = 0;

      const processNode = (node: Node): React.ReactNode => {
        key += 1;
        const currentKey = key;

        // Text node
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          if (text.trim() === '') return null;
          return <span key={currentKey}>{text}</span>;
        }

        // Element node
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const children = Array.from(element.childNodes)
            .map(processNode)
            .filter(Boolean);

          switch (element.tagName.toLowerCase()) {
            case 'blockquote':
              return (
                <Box
                  key={currentKey}
                  sx={{
                    borderLeft: `3px solid ${theme.palette.customColors.dtAlphaBorderColor}`,
                    backgroundColor: 'rgba(59, 59, 59, 0.43)',
                    padding: '8px 12px',
                    margin: '8px 0',
                    borderRadius: 2,
                  }}
                >
                  {children}
                </Box>
              );

            case 'p':
              return (
                <Box key={currentKey} sx={{ margin: '4px 0' }}>
                  {children}
                </Box>
              );

            case 'strong':
            case 'b':
              return (
                <span key={currentKey} style={{ fontWeight: 700 }}>
                  {children}
                </span>
              );

            case 'em':
            case 'i':
              return (
                <span key={currentKey} style={{ fontStyle: 'italic' }}>
                  {children}
                </span>
              );

            case 'u':
              return (
                <span key={currentKey} style={{ textDecoration: 'underline' }}>
                  {children}
                </span>
              );

            case 'strike':
            case 's':
            case 'del':
              return (
                <span
                  key={currentKey}
                  style={{ textDecoration: 'line-through' }}
                >
                  {children}
                </span>
              );

            case 'br':
              return <br key={currentKey} />;

            case 'span':
              // Check if it's an inline spoiler (new format from editor)
              if (element.hasAttribute('data-spoiler')) {
                const spoilerText =
                  element.getAttribute('data-visible-text') || 'спойлер';
                const isRevealed = revealedSpoilers.has(currentKey);

                return (
                  <Box
                    key={currentKey}
                    component="span"
                    onClick={() => {
                      setRevealedSpoilers((prev) => {
                        const next = new Set(prev);
                        if (next.has(currentKey)) {
                          next.delete(currentKey);
                        } else {
                          next.add(currentKey);
                        }
                        return next;
                      });
                    }}
                    sx={{
                      backgroundColor: 'rgba(124, 58, 237, 0.2)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-block',
                      margin: '0 2px',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                      '&:hover': {
                        backgroundColor: 'rgba(124, 58, 237, 0.3)',
                        borderColor: 'rgba(124, 58, 237, 0.5)',
                      },
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'rgba(124, 58, 237, 0.8)',
                        marginRight: '4px',
                      }}
                    >
                      {spoilerText}
                    </Typography>
                    {isRevealed && (
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.875rem',
                          color: theme.palette.customColors.dtPrimaryTextColor,
                        }}
                      >
                        {element.textContent}
                      </Typography>
                    )}
                  </Box>
                );
              }

              // Check if it's an inline spoiler (old format from existing comments)
              if (
                element.classList.contains('spoiler-node') &&
                element.hasAttribute('data-spoiler-type')
              ) {
                const spoilerText =
                  element.getAttribute('data-spoiler-text') || 'спойлер';
                const isRevealed = revealedSpoilers.has(currentKey);

                // Find spoiler content
                const spoilerContent = element.querySelector(
                  '.spoiler-node__text',
                );
                const spoilerHTML = spoilerContent?.innerHTML || '';

                return (
                  <Box
                    key={currentKey}
                    component="span"
                    onClick={() => {
                      setRevealedSpoilers((prev) => {
                        const next = new Set(prev);
                        if (next.has(currentKey)) {
                          next.delete(currentKey);
                        } else {
                          next.add(currentKey);
                        }
                        return next;
                      });
                    }}
                    sx={{
                      backgroundColor: 'rgba(124, 58, 237, 0.2)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-block',
                      margin: '0 2px',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                      '&:hover': {
                        backgroundColor: 'rgba(124, 58, 237, 0.3)',
                        borderColor: 'rgba(124, 58, 237, 0.5)',
                      },
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'rgba(124, 58, 237, 0.8)',
                        marginRight: '4px',
                      }}
                    >
                      {spoilerText}
                    </Typography>
                    {isRevealed && (
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.875rem',
                          color: theme.palette.customColors.dtPrimaryTextColor,
                        }}
                      >
                        {parseHTML(spoilerHTML)}
                      </Typography>
                    )}
                  </Box>
                );
              }

              return <span key={currentKey}>{children}</span>;

            case 'div':
              // Check if it's a spoiler
              if (element.classList.contains('spoiler-node')) {
                const spoilerText =
                  element.getAttribute('data-spoiler-text') || 'Спойлер';
                const isRevealed = revealedSpoilers.has(currentKey);

                // Find spoiler content
                const spoilerContent = element.querySelector(
                  '.spoiler-node__text',
                );
                const spoilerHTML = spoilerContent?.innerHTML || '';

                return (
                  <Box
                    key={currentKey}
                    sx={{
                      margin: '8px 0',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Spoiler header */}
                    <Box
                      onClick={() => {
                        setRevealedSpoilers((prev) => {
                          const next = new Set(prev);
                          if (next.has(currentKey)) {
                            next.delete(currentKey);
                          } else {
                            next.add(currentKey);
                          }
                          return next;
                        });
                      }}
                      sx={{
                        backgroundColor: 'rgba(59, 59, 59, 0.43)',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(124, 58, 237, 0.2)',
                        },
                      }}
                    >
                      {isRevealed ? (
                        <ExpandLess
                          sx={{
                            fontSize: '1.25rem',
                            color: theme.palette.customColors.dtSecondaryColor,
                          }}
                        />
                      ) : (
                        <ExpandMore
                          sx={{
                            fontSize: '1.25rem',
                            color: theme.palette.customColors.dtSecondaryColor,
                          }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: theme.palette.customColors.dtSecondaryColor,
                          ml: 0.5,
                        }}
                      >
                        {spoilerText}
                      </Typography>
                    </Box>

                    {/* Spoiler content */}
                    {isRevealed && (
                      <Box
                        sx={{
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          padding: '8px 12px',
                          borderTop: `1px solid ${theme.palette.customColors.dtBorderColor}`,
                        }}
                      >
                        {parseHTML(spoilerHTML)}
                      </Box>
                    )}
                  </Box>
                );
              }
              return (
                <Box key={currentKey} sx={{ margin: '4px 0' }}>
                  {children}
                </Box>
              );

            default:
              return <span key={currentKey}>{children}</span>;
          }
        }

        return null;
      };

      Array.from(doc.body.childNodes).forEach((node) => {
        const rendered = processNode(node);
        if (rendered) {
          elements.push(rendered);
        }
      });

      return elements;
    },
    [theme, revealedSpoilers],
  );

  /**
   * Memoized render of main HTML
   */
  const renderedContent = useMemo(() => parseHTML(html), [html, parseHTML]);

  return (
    <Box
      sx={{
        '& > *:first-of-type': {
          marginTop: 0,
        },
        '& > *:last-child': {
          marginBottom: 0,
        },
      }}
    >
      {renderedContent}
    </Box>
  );
}

export default React.memo(CommentText);
