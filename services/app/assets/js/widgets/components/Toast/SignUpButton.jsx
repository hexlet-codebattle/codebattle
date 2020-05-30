import React from 'react';
import i18n from '../../../i18n';

const SignUpButton = () => (
  <a className="btn btn-success btn-block" href="/auth/github">
    {i18n.t('Sign up')}
  </a>
);

export default SignUpButton;
