import React, { memo, useState, useCallback, Fragment } from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch } from 'react-redux';

import { Box, Table, Text } from '@mantine/core';

import { type AppDispatch } from '@/slices/store';

import { getResults } from '../../middlewares/Tournament';

import useTournamentPanel from './useTournamentPanel';

interface TaskRankingItem {
  taskId: number;
  level?: string;
  name?: string;
  roundPosition: number;
  winsCount?: number;
  min?: number;
  p5?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p95?: number;
  max?: number;
}

interface TaskRankingPanelProps {
  type: string;
  state: string;
  handleTaskSelectClick: (event: React.MouseEvent<HTMLTableRowElement>) => void;
}

const tableDataCellProps = {
  className: 'cb-custom-event-td',
  p: 4,
  pl: 24,
  style: {
    whiteSpace: 'nowrap' as const,
    position: 'relative' as const,
    verticalAlign: 'middle' as const,
  },
};

function TaskRankingPanel({ type, state, handleTaskSelectClick }: TaskRankingPanelProps) {
  const dispatch = useDispatch<AppDispatch>();

  const [items, setItems] = useState<TaskRankingItem[]>([]);

  const fetchData = useCallback(
    () => dispatch(getResults(type, {}, setItems)),
    [setItems, dispatch, type],
  );

  useTournamentPanel(fetchData, state);

  return (
    <Box
      mt={{ base: 8, lg: 0 }}
      mb={8}
      px={4}
      className="cb-rounded cb-overflow-x-auto cb-overflow-y-auto"
      style={{ position: 'relative' }}
    >
      <Table striped className="cb-custom-event-table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('Round')}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('Task')}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('Count of solutions')}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('Fastest time to solve task (sec)')}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('%{percent}% (sec)', { percent: 25 })}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('%{percent}% (sec)', { percent: 50 })}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('%{percent}% (sec)', { percent: 75 })}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('%{percent}% (sec)', { percent: 85 })}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('%{percent}% (sec)', { percent: 95 })}
            </Table.Th>
            <Table.Th c="dimmed" fw={300} p={4} pl={24}>
              {i18next.t('Slowest time to solve task (sec)')}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => (
            <Fragment key={`${type}-task-${item.taskId}`}>
              <Table.Tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
              <Table.Tr
                onClick={handleTaskSelectClick}
                data-task-id={item.taskId}
                fw={700}
                style={{ cursor: 'pointer' }}
                className={cn('cb-text-light cb-custom-event-tr', {
                  'cb-custom-event-bg-success': item.level === 'easy',
                  'cb-custom-event-bg-orange': item.level === 'elementary',
                  'cb-custom-event-bg-blue': item.level === 'medium',
                  'cb-custom-event-bg-brown': item.level === 'hard',
                })}
              >
                <Table.Td {...tableDataCellProps}>{item.roundPosition + 1}</Table.Td>
                <Table.Td title={item.name} {...tableDataCellProps}>
                  <Text className="cb-custom-event-name" mr="xs">
                    {item.name}
                  </Text>
                </Table.Td>
                <Table.Td {...tableDataCellProps}>{item.winsCount}</Table.Td>
                <Table.Td {...tableDataCellProps}>{item.min}</Table.Td>
                <Table.Td {...tableDataCellProps}>{item.p5}</Table.Td>
                <Table.Td {...tableDataCellProps}>{item.p25}</Table.Td>
                <Table.Td {...tableDataCellProps}>{item.p50}</Table.Td>
                <Table.Td {...tableDataCellProps}>{item.p75}</Table.Td>
                <Table.Td {...tableDataCellProps}>{item.p95}</Table.Td>
                <Table.Td {...tableDataCellProps}>{item.max}</Table.Td>
              </Table.Tr>
            </Fragment>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

export default memo(TaskRankingPanel);
