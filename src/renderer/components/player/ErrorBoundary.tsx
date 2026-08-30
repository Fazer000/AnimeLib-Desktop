import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import {
  ACCENT,
  ACCENT_DEEP,
  BLACK_SHORT,
  TEXT_PRIMARY,
  WHITE,
} from '../../theme/palette';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Обрабатываем ошибку без логирования в консоль
    // В продакшене можно отправить ошибку в сервис мониторинга
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: BLACK_SHORT,
            padding: 4,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: '80px',
              fontWeight: 'bold',
              marginBottom: 2,
              color: ACCENT,
            }}
          >
            Ошибка
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: WHITE,
              marginBottom: 1,
              fontWeight: 500,
            }}
          >
            Произошла ошибка в плеере
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: TEXT_PRIMARY,
              marginBottom: 4,
              textAlign: 'center',
              maxWidth: '500px',
            }}
          >
            {error?.message || 'Неизвестная ошибка'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            sx={{
              backgroundColor: ACCENT,
              color: WHITE,
              padding: '10px 30px',
              fontSize: '14px',
              textTransform: 'none',
              borderRadius: 4,
              fontWeight: 500,
              '&:hover': {
                backgroundColor: ACCENT_DEEP,
              },
            }}
          >
            Попробовать снова
          </Button>
        </Box>
      );
    }

    const { children } = this.props;
    return children;
  }
}

export default ErrorBoundary;
