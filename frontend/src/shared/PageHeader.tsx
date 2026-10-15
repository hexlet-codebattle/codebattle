import { Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Links/buttons under the title (centered, like the lobby's Tournaments header). */
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Stack gap={6} align="center" ta="center" mb="lg">
      <Title order={2}>{title}</Title>
      {subtitle && (
        <Text size="sm" c="dimmed">
          {subtitle}
        </Text>
      )}
      {actions && (
        <Group gap={6} justify="center">
          {actions}
        </Group>
      )}
    </Stack>
  );
}
