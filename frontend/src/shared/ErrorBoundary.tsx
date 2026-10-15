import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { t } from '@/i18n';

interface ErrorBoundaryState {
  error: Error | null;
}

/** Keeps a render error from unmounting the whole app into a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Center mih="100vh" p="md">
        <Stack align="center" gap="sm" ta="center">
          <Title order={3}>{t('Something went wrong')}</Title>
          <Text size="sm" c="dimmed" ff="monospace">
            {this.state.error.message}
          </Text>
          <Button onClick={() => window.location.reload()}>{t('Reload page')}</Button>
        </Stack>
      </Center>
    );
  }
}
