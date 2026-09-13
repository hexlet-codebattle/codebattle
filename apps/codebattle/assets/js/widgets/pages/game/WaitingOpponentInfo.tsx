import React from 'react';

import { Box, Button, Flex, Text, Title } from '@mantine/core';
import i18n from 'i18next';

import CopyButton from '../../components/CopyButton';

interface WaitingOpponentInfoProps {
  gameUrl: string;
}

function WaitingOpponentInfo({ gameUrl }: WaitingOpponentInfoProps) {
  return (
    <Box py="md">
      <Box w={{ base: '100%', lg: '83.3333%', xl: '66.6667%' }} mx="auto" px={0}>
        <Box
          bg="cbPanel"
          c="cbText"
          p={{ base: 'xl', lg: 'xl' }}
          ta="center"
          style={{
            boxShadow: 'var(--mantine-shadow-sm)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <Title order={2} fw={400} c="white" mb="sm">
            {i18n.t('Waiting for an opponent')}
          </Title>
          <Text size="lg" mb="xl" c="white" style={{ opacity: 0.5 }}>
            {i18n.t('Please wait for someone to join or send an invite using the link below')}
          </Text>
          <Flex justify="center">
            <Flex align="stretch" style={{ width: 'auto', maxWidth: '100%' }}>
              <Box
                bg="cbPanel"
                c="cbText"
                id="gameUrl"
                px="sm"
                py="xs"
                style={{
                  maxWidth: '100%',
                  wordBreak: 'break-all',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRight: 0,
                  borderRadius: 'var(--mantine-radius-sm) 0 0 var(--mantine-radius-sm)',
                }}
              >
                {gameUrl}
              </Box>
              <CopyButton value={gameUrl} style={{ borderRadius: 0 }} />
              <Button
                color="red"
                radius={0}
                style={{
                  borderRadius: '0 var(--mantine-radius-sm) var(--mantine-radius-sm) 0',
                }}
                data-method="delete"
                data-csrf={window.csrf_token}
                data-to={gameUrl}
              >
                {i18n.t('Cancel')}
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
}

export default WaitingOpponentInfo;
