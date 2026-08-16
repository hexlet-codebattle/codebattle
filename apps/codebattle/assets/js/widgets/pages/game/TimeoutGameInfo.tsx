import React from 'react';

import { Box, Flex, Text, Title } from '@mantine/core';
import i18n from 'i18next';

function TimeoutGameInfo() {
  return (
    <Flex justify="center" className="cb-test" style={{ boxShadow: 'var(--mantine-shadow-sm)' }}>
      <Box
        w={{ base: '100%', lg: '66.6667%', xl: '66.6667%' }}
        style={{ maxWidth: 900 }}
        ta="center"
      >
        <Title order={2} fw={400}>
          {i18n.t('Time is Over')}
        </Title>
        <Text size="lg" mb="lg">
          {i18n.t('This game has not been started')}
        </Text>
      </Box>
    </Flex>
  );
}

export default TimeoutGameInfo;
