import React from 'react';

import { Button } from '@mantine/core';

import i18n from '../../../i18n';

function SignUpButton() {
  return (
    <Button component="a" href="/users/new" color="cbSuccess" radius="md" fullWidth>
      {i18n.t('Sign up')}
    </Button>
  );
}

export default SignUpButton;
