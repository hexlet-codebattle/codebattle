import React from 'react';
import { Box, Text } from '@mantine/core';
import { type ExternalSetup } from './types';

interface AdminExternalSetupPanelProps {
  externalSetup: ExternalSetup;
}

function AdminExternalSetupPanel({ externalSetup }: AdminExternalSetupPanelProps) {
  return (
    <Box p="md" w="100%" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
      <Text size="sm" mt="xs">
        <Box mb="xs">
          <strong>Repo:</strong> {externalSetup.repoState}
        </Box>
        <Box mb="xs">
          <strong>Role:</strong> {externalSetup.roleState}
        </Box>
        <Box mb="xs">
          <strong>Secret:</strong> {externalSetup.secretState}
        </Box>
        <Box mb="xs">
          <strong>Repo slug:</strong> {externalSetup.repoSlug || 'n/a'}
        </Box>
        <Box mb="xs">
          <strong>Repo URL:</strong>{' '}
          {externalSetup.repoUrl ? (
            <a href={externalSetup.repoUrl} target="_blank" rel="noreferrer">
              {externalSetup.repoUrl}
            </a>
          ) : (
            'n/a'
          )}
        </Box>
        {externalSetup.lastError && Object.keys(externalSetup.lastError).length > 0 && (
          <Text component="pre" mt="xs" mb={0} c="#dc3545" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(externalSetup.lastError, null, 2)}
          </Text>
        )}
      </Text>
    </Box>
  );
}

export default AdminExternalSetupPanel;
