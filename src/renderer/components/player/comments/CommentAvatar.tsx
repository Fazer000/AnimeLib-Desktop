import { Box, useTheme } from '@mui/material';
import useImageWithReferer from '../../../hooks/useImageWithReferer';

interface CommentAvatarProps {
  username: string;
  avatarUrl?: string;
  size: number;
  fontSize: string;
  shadow?: string;
}

/** Аватар автора с подстановкой первой буквы имени, когда картинки нет. */
function CommentAvatar({
  username,
  avatarUrl,
  size,
  fontSize,
  shadow,
}: CommentAvatarProps) {
  const theme = useTheme();
  const resolvedUrl = useImageWithReferer(avatarUrl);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        backgroundColor: theme.palette.customColors.dtSecondaryColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 600,
        overflow: 'hidden',
        position: 'relative',
        ...(shadow ? { boxShadow: shadow } : {}),
      }}
    >
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={username}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.customColors.dtPrimaryTextColor,
          zIndex: resolvedUrl ? -1 : 1,
        }}
      >
        {username.charAt(0).toUpperCase()}
      </Box>
    </Box>
  );
}

CommentAvatar.defaultProps = { avatarUrl: undefined, shadow: undefined };

export default CommentAvatar;
