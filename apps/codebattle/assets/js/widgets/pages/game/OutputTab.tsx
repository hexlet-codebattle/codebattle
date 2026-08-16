import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Badge, Text } from '@mantine/core';

import i18n from '../../../i18n';
import color from '../../config/statusColor';

import { type OutputData } from './Output';

const STATUS_BADGE_COLORS: Record<string, string> = {
  success: 'green',
  danger: 'red',
  info: 'blue',
  secondary: 'gray',
};

const getMessage = (status?: string) => {
  switch (status) {
    case 'timeout':
      return i18n.t(
        "We couldn't retrieve check results. Check your network connection or your solution for bugs or :prod_is_down:",
      );
    case 'error':
      return i18n.t('Solution cannot be executed');
    case 'failure':
      return i18n.t('Tests failed');
    case 'ok':
      return i18n.t('Yay! All tests passed!');
    default:
      return i18n.t('Opponent tests');
  }
};

interface OutputTabProps {
  sideOutput: OutputData;
  large?: boolean;
  side?: string;
}

function OutputTab({ sideOutput, large = false }: OutputTabProps) {
  const { successCount = 0, assertsCount = 0, status } = sideOutput;
  const isShowMessage = status === 'failure';
  const statusColor = color[status as keyof typeof color];
  const message = getMessage(status);
  const percent = Math.ceil((100 * successCount) / assertsCount);

  const assertsStatusMessage = i18n.t(
    'You passed %{successCount} from %{assertsCount} asserts. (%{percent}%)',
    { successCount, assertsCount, percent },
  );

  if (large) {
    const textColor =
      status === 'error'
        ? 'red'
        : status === 'failure'
          ? 'blue'
          : status === 'ok'
            ? 'green'
            : undefined;

    return status === 'ok' ? (
      <FontAwesomeIcon
        icon="trophy"
        style={{ fontSize: '1.5rem', color: 'var(--mantine-color-yellow-4)' }}
      />
    ) : (
      <Text title={i18n.t('Asserts status')} c={textColor} component="div">
        <h2>{status === 'error' ? 'Error' : `${percent}%`}</h2>
      </Text>
    );
  }

  const badgeColor = STATUS_BADGE_COLORS[statusColor] ?? 'gray';

  return (
    <>
      {isShowMessage && (
        <Text span fw={700} c="white" size="sm" mr="md">
          {assertsStatusMessage}
        </Text>
      )}
      <Badge color={badgeColor} radius={0} py="xs" px="sm" size="lg">
        {message}
      </Badge>
    </>
  );
}

export default OutputTab;
