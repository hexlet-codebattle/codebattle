import { Anchor, Card, Code, Stack, Table, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

interface DevProps {
  commit: string | null;
  commit_url: string | null;
  deployed_at: string | null;
  deployment_time_provided: boolean;
  release_version: string;
  elixir_version: string;
  otp_version: string;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Table.Tr>
      <Table.Th scope="row" w="35%">{label}</Table.Th>
      <Table.Td style={{ overflowWrap: 'anywhere' }}>{children}</Table.Td>
    </Table.Tr>
  );
}

export default function Dev() {
  const { t } = useTranslation();
  const props = useSharedProps<DevProps>();
  const unavailable = t('Not available');

  return (
    <AppLayout>
      <Card maw={820} mx="auto" padding="xl">
        <PageHeader title={t('Developer info')} subtitle={t('Release and runtime details for this instance.')} />

        <Stack gap="xl">
          <Stack gap="xs">
            <Title order={3}>{t('Release')}</Title>
            <Table verticalSpacing="sm">
              <Table.Tbody>
                <InfoRow label={t('Deployed commit')}>
                  {props.commit_url ? (
                    <Anchor href={props.commit_url} target="_blank" rel="noreferrer" ff="monospace" size="sm">
                      {props.commit}
                    </Anchor>
                  ) : props.commit ? (
                    <Code>{props.commit}</Code>
                  ) : unavailable}
                </InfoRow>
                <InfoRow label={props.deployment_time_provided ? t('Deployed at (UTC)') : t('Initialized at (UTC)')}>
                  {props.deployed_at ?? unavailable}
                </InfoRow>
                <InfoRow label={t('Release version')}>{props.release_version}</InfoRow>
              </Table.Tbody>
            </Table>
            {!props.deployment_time_provided && (
              <Text size="sm" c="dimmed">
                {t('Deployment time was not supplied. The timestamp shows when this application was initialized.')}
              </Text>
            )}
          </Stack>

          <Stack gap="xs">
            <Title order={3}>{t('Runtime')}</Title>
            <Table verticalSpacing="sm">
              <Table.Tbody>
                <InfoRow label="Elixir">{props.elixir_version}</InfoRow>
                <InfoRow label="Erlang/OTP">{props.otp_version}</InfoRow>
              </Table.Tbody>
            </Table>
          </Stack>
        </Stack>
      </Card>
    </AppLayout>
  );
}
