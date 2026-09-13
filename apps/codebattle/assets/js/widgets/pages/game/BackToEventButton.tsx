import React from 'react';

import { Button } from '@mantine/core';
import i18next from 'i18next';

function BackToEventButton() {
  const eventUrl = '/';

  return (
    <Button component="a" href={eventUrl} color="cbSecondary" radius="md" fullWidth>
      {i18next.t('Back to event')}
    </Button>
  );
}

export default BackToEventButton;
