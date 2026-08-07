import React from 'react';

import { Center, Loader } from '@mantine/core';

import i18n from '../../i18n';

interface LoadingProps {
  adaptive?: boolean;
  large?: boolean;
  small?: boolean;
}

const getSize = ({ small = false, large = false, adaptive = false }: LoadingProps) => {
  switch (true) {
    case adaptive:
      return 16;
    case small:
      return 30;
    case large:
      return 100;
    default:
      return 50;
  }
};

function Loading(props: LoadingProps) {
  const size = getSize(props);

  return (
    <Center py="xs">
      <Loader size={size} color="gray" role="status" aria-label={i18n.t('Loading...')} />
    </Center>
  );
}

export default Loading;
