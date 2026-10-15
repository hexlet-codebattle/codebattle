import { Button, Card, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { GameApi } from '../useGame';
import classes from '../GameRoom.module.css';

/** A pass-code protected game: the code unlocks it for everyone in the room. */
export function LockScreen({ api }: { api: GameApi }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const ok = await api.enterPassCode(code.trim());
    setBusy(false);
    setError(!ok);
  };

  return (
    <div className={classes.waiting}>
      <Card w={380} maw="100%" padding="xl" component="form" onSubmit={submit}>
        <Stack gap="md" align="center">
          <IconLock size={32} />
          <Title order={3}>{t('This game is locked')}</Title>
          <Text size="sm" c="dimmed" ta="center">
            {t('Enter the pass code to start playing.')}
          </Text>
          <PasswordInput
            w="100%"
            autoFocus
            value={code}
            onChange={(event) => {
              setCode(event.currentTarget.value);
              setError(false);
            }}
            error={error ? t('Wrong pass code') : null}
            aria-label={t('Pass code')}
          />
          <Button type="submit" color="green" fullWidth loading={busy} disabled={!code.trim()}>
            {t('Unlock')}
          </Button>
        </Stack>
      </Card>
    </div>
  );
}
