import { Head } from '@inertiajs/react';
import { Alert, Button, Card, Container, Group, List, Stack, Text, Title } from '@mantine/core';
import { IconPlugConnected } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { oauthScopeLabels } from '@/features/settings/oauthScopes';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

interface ConsentProps {
  client_name: string;
  redirect_origin: string;
  scopes: string[];
  request: string;
}

export default function McpConsent() {
  const { t } = useTranslation();
  const props = useSharedProps<ConsentProps>();
  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

  return (
    <AppLayout>
      <Head title={t('Connect an application')} />
      <Container size="sm" py="xl">
        <Card withBorder padding="xl" radius="md">
          <Stack gap="lg">
            <Group>
              <IconPlugConnected size={28} />
              <Title order={2}>{t('Connect an application')}</Title>
            </Group>
            <Text>{t('%{name} is requesting access to your Codebattle account.', { name: props.client_name })}</Text>
            <Alert color="blue">
              <Text size="sm">{t('Application names are provided by their developers. Check the return address:')}</Text>
              <Text size="sm" fw={600} style={{ overflowWrap: 'anywhere' }}>
                {props.redirect_origin}
              </Text>
            </Alert>
            <List spacing="sm">
              {props.scopes.map((scope) => (
                <List.Item key={scope}>{t(oauthScopeLabels[scope] ?? scope)}</List.Item>
              ))}
            </List>
            <Text size="sm" c="dimmed">
              {t('You can disconnect this application at any time in Settings → Connected applications.')}
            </Text>
            <form method="post" action="/oauth/authorize">
              <input type="hidden" name="_csrf_token" value={csrf} />
              <input type="hidden" name="request" value={props.request} />
              <Group justify="flex-end">
                <Button type="submit" name="decision" value="deny" variant="default">
                  {t('Cancel')}
                </Button>
                <Button type="submit" name="decision" value="allow">
                  {t('Allow access')}
                </Button>
              </Group>
            </form>
          </Stack>
        </Card>
      </Container>
    </AppLayout>
  );
}
