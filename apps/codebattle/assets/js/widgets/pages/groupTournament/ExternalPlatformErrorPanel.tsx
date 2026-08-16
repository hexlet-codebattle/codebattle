import React from 'react';
import { Box, Button, Flex, Paper, Text } from '@mantine/core';

import i18n from '../../../i18n';

interface ExternalPlatformErrorPanelProps {
  requestInviteUpdates: () => void;
}

function ExternalPlatformErrorPanel({ requestInviteUpdates }: ExternalPlatformErrorPanelProps) {
  return (
    <Box w="100%" h="100%">
      <Flex justify="center" align="center" h="100%" w="100%">
        <Box
          w={{
            sm: '66.6667%',
            md: '50%',
            lg: '41.6667%',
          }}
          px={{ md: 'lg' }}
        >
          <Paper shadow="sm" radius="md" p="xl" bg="transparent">
            <Text ta="center" c="red" mb="md">
              {i18n.t(
                'Could not retrieve your external platform credentials. Please contact support.',
              )}
            </Text>
            <Flex justify="center">
              <Button
                type="button"
                variant="outline"
                color="cbSecondary"
                radius="md"
                onClick={requestInviteUpdates}
              >
                {i18n.t('Retry')}
              </Button>
            </Flex>
          </Paper>
        </Box>
      </Flex>
    </Box>
  );
}

export default ExternalPlatformErrorPanel;
