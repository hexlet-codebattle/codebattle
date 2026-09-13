import React from 'react';

import { Group, Text } from '@mantine/core';
import moment from 'moment';

interface InfoMessageProps {
  text: string;
  time?: number | null;
}

function InfoMessage({ text, time }: InfoMessageProps) {
  return (
    <Group align="baseline" gap="xs">
      <Text component="small" size="sm" c="dimmed">
        {text}
      </Text>
      <Text component="small" size="sm" c="dimmed" ml="auto">
        {time ? moment.unix(time).format('HH:mm:ss') : ''}
      </Text>
    </Group>
  );
}

export default InfoMessage;
