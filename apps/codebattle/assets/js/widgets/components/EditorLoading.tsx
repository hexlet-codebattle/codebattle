import React, { memo } from 'react';

import { Flex } from '@mantine/core';

import Loading from './Loading';

interface EditorLoadingProps {
  loading: boolean;
}

function EditorLoading({ loading }: EditorLoadingProps) {
  return (
    <Flex
      pos="absolute"
      w="100%"
      h="100%"
      align="center"
      justify="center"
      display={loading ? 'flex' : 'none'}
      className={loading ? 'cb-loading-background' : undefined}
    >
      <Loading />
    </Flex>
  );
}

export default memo(EditorLoading);
