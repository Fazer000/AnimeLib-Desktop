import React, { useState } from 'react';
import { Button, useTheme } from '@mui/material';
import { Bell, BellRing } from '../icons';
import type { AnimeSubscriptionsState } from '../../hooks/useAnimeSubscriptions';
import AnimeSubscriptionDialog from './AnimeSubscriptionDialog';
import { cardActionAccentSx, cardActionButtonSx } from './cardActionStyles';

interface SubscriptionButtonProps {
  state: AnimeSubscriptionsState;
}

/**
 * Кнопка уведомлений о выходе серий: подсвечена, если подписка есть
 */
function SubscriptionButton({ state }: SubscriptionButtonProps) {
  const { customColors } = useTheme().palette;
  const [open, setOpen] = useState<boolean>(false);
  const subscribed = state.subscriptions.length > 0;

  return (
    <>
      <Button
        disabled={!state.loaded}
        onClick={() => setOpen(true)}
        sx={{
          ...cardActionButtonSx(customColors),
          ...(subscribed ? cardActionAccentSx(customColors) : {}),
        }}
      >
        {subscribed ? <BellRing /> : <Bell />}
        Уведомления
      </Button>

      <AnimeSubscriptionDialog
        open={open}
        teams={state.teams}
        subscriptions={state.subscriptions}
        onSave={state.save}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default SubscriptionButton;
