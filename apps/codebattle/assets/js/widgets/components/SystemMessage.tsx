import React from 'react';

import { Group, Text } from '@mantine/core';

interface SystemMessageProps {
  meta?: { status?: string } | null;
  text: string;
}

const statusColor = (status?: string) => {
  if (['error', 'failure'].includes(status ?? '')) return 'red';
  if (status === 'success') return 'cbSuccess';
  if (status === 'event') return 'dimmed';
  return undefined;
};

function SystemMessage({ text, meta }: SystemMessageProps) {
  return (
    <Group align="baseline" gap="xs">
      <Text component="small" size="sm" c={statusColor(meta?.status)}>
        {text}
      </Text>
    </Group>
  );
}

export default SystemMessage;
