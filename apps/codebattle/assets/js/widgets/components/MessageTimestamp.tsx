import React, { memo } from 'react';

import { Text } from '@mantine/core';
import moment from 'moment';

interface MessageTimestampProps {
  time: number;
}

function MessageTimestamp({ time }: MessageTimestampProps) {
  return (
    <Text component="span" c="dimmed">
      {moment.utc(moment.unix(time)).local().format('hh:mm A')}
    </Text>
  );
}

export default memo(MessageTimestamp);
