import { Center, Loader, Text } from '@mantine/core';
import type { ReactNode } from 'react';

/** Centered empty / loading / error line inside a panel. */
export function PanelMessage({ loading, children }: { loading?: boolean; children?: ReactNode }) {
  if (loading) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Text c="dimmed" ta="center" py="md" size="sm">
      {children}
    </Text>
  );
}

/** Postgres decimals arrive as strings ("12.50"). */
export const num = (value: number | string | null | undefined) => (value == null || value === '' ? null : Number(value));

export const pct = (value: number | string | null | undefined) => {
  const parsed = num(value);
  return parsed == null ? '—' : `${parsed.toFixed(1)}%`;
};
