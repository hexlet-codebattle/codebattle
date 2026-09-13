import React from 'react';

import { Button } from '@mantine/core';

import i18n from '../../../i18n';

export default function BackToHomeButton() {
  const title = i18n.t('Back to Home');
  const handleClick = () => {
    window.location.href = '/';
  };

  return (
    <Button color="cbSecondary" radius="md" fullWidth onClick={handleClick}>
      {title}
    </Button>
  );
}
