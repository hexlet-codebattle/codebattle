import React, { useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Badge, Box, Button, Collapse, Flex, Text, Tooltip } from '@mantine/core';

import i18n from '../../i18n';

interface Assert {
  id?: string | number;
  status: string;
  // assert value/result/expected/arguments are arbitrary test-case data
  // (any JSON shape) interpolated into strings for display.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expected?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arguments?: any;
  output?: string;
}

// Maps a status color (info/danger/success/secondary) to the nearest Mantine color.
const STATUS_COLORS: Record<string, string> = {
  success: 'green',
  danger: 'red',
  info: 'blue',
  secondary: 'gray',
};

// The old markup scaled its typography with Bootstrap heading classes (h1–h5),
// driven by a numeric `fontSize` zoom (0 = default). Map it to the equivalent
// rem font-size so the replayer zoom keeps working without those classes.
const FONT_SIZES = ['', '1.25rem', '1.5rem', '1.75rem', '2rem', '2.5rem'];
const fontSizeToRem = (fontSize: number) => FONT_SIZES[Math.min(fontSize, 5)] || undefined;

interface SubMenuProps {
  children?: React.ReactNode;
  statusColor?: string;
  assert: Assert;
  hasOutput?: React.ReactNode;
  uniqIndex?: string | number;
  executionTime?: number | string;
  fontSize?: number;
}

function SubMenu({
  children,
  statusColor,
  assert,
  hasOutput,
  uniqIndex,
  executionTime,
  fontSize = 0,
}: SubMenuProps) {
  const [isShowLog, setIsShowLog] = useState(true);

  const { result = assert.value } = assert;

  const fz = fontSizeToRem(fontSize);
  const mc = STATUS_COLORS[statusColor ?? 'info'] ?? 'blue';
  const badgeFzStyle = fz ? ({ '--badge-fz': fz } as React.CSSProperties) : undefined;

  return (
    <Box
      className="cb-bg-highlight-panel"
      c="white"
      style={{
        padding: '0.75rem 1.25rem',
        borderTop: '1px solid var(--mantine-color-default-border)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <div id={`heading${uniqIndex}`}>
        <Flex align="center">
          <FontAwesomeIcon
            icon={statusColor === 'success' ? 'check-circle' : 'exclamation-circle'}
            color={`var(--mantine-color-${mc}-6)`}
            style={{ marginRight: 'var(--mantine-spacing-sm)', fontSize: fz }}
          />
          <Badge color={mc} mr="md" style={badgeFzStyle}>
            {assert.status}
          </Badge>
          {executionTime !== undefined && Number(executionTime) !== 0 ? (
            <Tooltip label={i18n.t('Execution Time')} position="top" withArrow>
              <Badge color="gray" mr="md" style={badgeFzStyle}>
                {executionTime}
              </Badge>
            </Tooltip>
          ) : null}
          {assert.output && (
            <Button
              variant="outline"
              color="blue"
              size="compact-xs"
              radius="md"
              style={{ fontSize: fz }}
              onClick={() => setIsShowLog(!isShowLog)}
              leftSection={
                <FontAwesomeIcon icon={isShowLog ? 'arrow-circle-up' : 'arrow-circle-down'} />
              }
            >
              {i18n.t('STDOUT')}
            </Button>
          )}
        </Flex>
        <Box component="pre" my="xs">
          {(() => {
            const labels = [i18n.t('Receive:'), i18n.t('Expected:'), i18n.t('Arguments:')];
            const width = Math.max(...labels.map((l) => l.length));
            const [receiveLabel, expectedLabel, argumentsLabel] = labels.map((l) =>
              l.padEnd(width),
            );
            return (
              <>
                <Text span display="block" fz={fz}>{`${receiveLabel} ${result}`}</Text>
                <Text span display="block" fz={fz}>{`${expectedLabel} ${assert.expected}`}</Text>
                <Text span display="block" fz={fz}>{`${argumentsLabel} ${assert.arguments}`}</Text>
              </>
            );
          })()}
        </Box>
        {hasOutput && <Collapse expanded={isShowLog}>{children}</Collapse>}
      </div>
    </Box>
  );
}

interface ItemProps {
  output?: string;
  fontSize?: number;
}

function Item({ output, fontSize = 0 }: ItemProps) {
  if (output === '') {
    return null;
  }

  const fz = fontSizeToRem(fontSize);

  return (
    <Box
      c="white"
      mb={0}
      fz={fz}
      style={{
        padding: '0.75rem 1.25rem',
        border: '1px solid transparent',
        borderRadius: '0.25rem',
      }}
    >
      <pre>{output}</pre>
    </Box>
  );
}

const AccordeonBox = { Item, SubMenu };

export default AccordeonBox;
