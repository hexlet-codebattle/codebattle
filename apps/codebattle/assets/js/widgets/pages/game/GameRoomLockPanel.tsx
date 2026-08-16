import React, { useState, useRef, useCallback } from 'react';

import { Button, Flex, Stack, Text, TextInput } from '@mantine/core';
import { useDispatch } from 'react-redux';

import { type AppDispatch } from '@/slices';

import i18n from '../../../i18n';
import { sendPassCode } from '../../middlewares/Room';

function GameRoomLockPanel() {
  const dispatch = useDispatch<AppDispatch>();

  const inputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<Error | null>(null);

  const onChangePassCode = useCallback(() => {
    if (error) {
      setError(null);
    }
  }, [error, setError]);
  const onSubmitCode = useCallback(() => {
    const value = (inputRef.current?.value || '').replaceAll(' ', '');
    const onError = (err: Error) => setError(err);

    dispatch(sendPassCode(value, onError));
  }, [inputRef, setError, dispatch]);

  return (
    <Stack w="50%" gap="xs">
      <Text ta="center" size="xl" fw={700}>
        {i18n.t('Game is Locked')}
      </Text>
      <Flex gap="xs">
        <TextInput
          ref={inputRef}
          id="game-lock"
          type="text"
          aria-label={i18n.t('Game lock input for pass code')}
          placeholder={i18n.t('Enter pass code')}
          error={!!error}
          onChange={onChangePassCode}
          flex={1}
        />
        <Button color="cbSuccess" radius="md" c="white" onClick={onSubmitCode}>
          {i18n.t('Submit')}
        </Button>
      </Flex>
      <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between">
        <Text c="dimmed" m="xs">
          {i18n.t('Example: 12345678')}
        </Text>
        {error && (
          <Text c="red" m="xs">
            {error.message}
          </Text>
        )}
      </Flex>
    </Stack>
  );
}

export default GameRoomLockPanel;
