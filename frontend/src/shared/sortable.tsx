import { Group, Table, type TableThProps, Tooltip, UnstyledButton } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconSelector } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { formatAgo } from './formatAgo';

export type SortDir = 'asc' | 'desc';
type Value = string | number | null | undefined;

/**
 * Client-side sorting for tables that already hold the whole list. `accessors`
 * maps a column key to the value to compare; nulls always sort last.
 */
export function useSort<Row, Key extends string>(
  rows: Row[],
  accessors: Record<Key, (row: Row) => Value>,
  // NoInfer: the column keys come from `accessors`, not from the initial sort.
  initial: { key: NoInfer<Key>; dir: SortDir },
) {
  const [sort, setSort] = useState<{ key: Key; dir: SortDir }>(initial);

  const sorted = useMemo(() => {
    const get = accessors[sort.key];
    const sign = sort.dir === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x == null || x === '') return y == null || y === '' ? 0 : 1;
      if (y == null || y === '') return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
      return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * sign;
    });
    // accessors are static per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  /** Click: sort by this column ascending, again: descending. */
  const toggle = (key: Key) =>
    setSort((current) => ({ key, dir: current.key === key && current.dir === 'asc' ? 'desc' : 'asc' }));

  return { sorted, sort, toggle };
}

interface SortThProps<Key extends string> extends Omit<TableThProps, 'children' | 'onClick'> {
  column: Key;
  sort: { key: Key; dir: SortDir };
  onSort: (key: Key) => void;
  /** Header text: the field's real name, e.g. `time_to_solve_sec`. */
  children: string;
}

/** Monospace field-name header (as in the legacy tables) that sorts on click. */
export function SortTh<Key extends string>({ column, sort, onSort, children, ...props }: SortThProps<Key>) {
  const active = sort.key === column;
  const Icon = active ? (sort.dir === 'asc' ? IconArrowUp : IconArrowDown) : IconSelector;

  return (
    <Table.Th tt="none" ff="monospace" fz="xs" fw={600} lts={0} {...props}>
      <UnstyledButton
        onClick={() => onSort(column)}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        fz="xs"
        ff="monospace"
        fw={600}
        c="inherit"
        style={{ whiteSpace: 'nowrap' }}
      >
        <Group gap={4} wrap="nowrap" justify={props.ta === 'right' ? 'flex-end' : 'flex-start'}>
          <span>{children}</span>
          <Icon size={12} opacity={active ? 1 : 0.4} />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

/** Server NaiveDateTimes are UTC without a zone suffix. */
const utc = (value: string) => (/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-12 16:00" in local time (compact for data tables); "3 days ago" on hover. */
export function Timestamp({ value }: { value: string | null | undefined }) {
  if (!value) return <>—</>;

  const date = new Date(utc(value));
  const text = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return (
    <Tooltip label={formatAgo(utc(value))} openDelay={300}>
      <span style={{ whiteSpace: 'nowrap', fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 'var(--mantine-font-size-xs)' }}>
        {text}
      </span>
    </Tooltip>
  );
}
