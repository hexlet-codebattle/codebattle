import { Button, Group, Modal, Table } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { getLocale } from '@/i18n';

import classes from './AdminConnections.module.css';
import type { Connection } from './connections';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Table.Tr>
      <Table.Td>{label}</Table.Td>
      <Table.Td>{value ?? '—'}</Table.Td>
    </Table.Tr>
  );
}

interface ConnectionModalProps {
  connection: Connection | null;
  onClose: () => void;
  onAdd: (userId: number) => void;
}

export function ConnectionModal({ connection, onClose, onAdd }: ConnectionModalProps) {
  const { t } = useTranslation();

  return (
    <Modal opened={!!connection} onClose={onClose} title={t('Connection details')} centered size="lg">
      {connection && (
        <>
          <Table className={classes.details} verticalSpacing={4}>
            <Table.Tbody>
              <Row label={t('User')} value={<a href={`/users/${connection.userId}`}>{connection.name}</a>} />
              <Row label={t('User ID')} value={connection.userId} />
              <Row label={t('Page')} value={connection.label} />
              <Row
                label={t('Path')}
                value={connection.path && <a href={connection.path}>{connection.path}</a>}
              />
              <Row label={t('State')} value={connection.state} />
              <Row
                label={t('Connected at')}
                value={connection.onlineAt && new Date(connection.onlineAt * 1000).toLocaleString(getLocale())}
              />
              <Row label={t('Ref')} value={connection.phxRef} />
            </Table.Tbody>
          </Table>
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              size="compact-sm"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                onAdd(connection.userId);
                onClose();
              }}
            >
              {t('Add to redirect list')}
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}
