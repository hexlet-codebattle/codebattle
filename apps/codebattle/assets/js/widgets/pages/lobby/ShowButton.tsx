import React from 'react';

import { Button } from '@mantine/core';

import i18n from '../../../i18n';

interface ShowButtonProps {
  url: string;
  type?: string;
}

function ShowButton({ url, type = 'table' }: ShowButtonProps) {
  return (
    <Button
      component="a"
      href={url}
      color="cbSecondary"
      size="sm"
      radius="md"
      px={type === 'table' ? 'lg' : undefined}
      ml={type === 'table' ? 'xs' : undefined}
    >
      {i18n.t('Show')}
    </Button>
  );
}

export default ShowButton;
