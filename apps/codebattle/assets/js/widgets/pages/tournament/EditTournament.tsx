import React, { useState, useCallback, useEffect } from 'react';

import { Alert, Button, Flex, Grid, Paper, Title } from '@mantine/core';
import { decamelizeKeys, camelizeKeys } from 'humps';
import noop from 'lodash/noop';

import i18n from '../../../i18n';
import Loading from '../../components/Loading';
import { alertVariantColor, darkThemeAlertStyles } from '../../ui/alert';

import TournamentForm from './TournamentForm';
import { formatDatetimeLocal, getBrowserTimezone } from './dateTime';

interface TournamentResult {
  id: number;
  [key: string]: unknown;
}

type FormErrors = Partial<Record<string, string | string[]>> & {
  base?: string;
};

interface ResponseErrorData {
  errors?: FormErrors;
  error?: string;
  [key: string]: unknown;
}

interface ResponseError extends Error {
  response?: { data: ResponseErrorData; status: number };
}

interface NotificationData {
  variant?: string;
  message?: string;
}

const notifications: {
  success: NotificationData;
  error: NotificationData;
  empty: NotificationData;
} = {
  success: { variant: 'success', message: 'Tournament updated successfully' },
  error: { variant: 'danger', message: 'Failed to update tournament' },
  empty: {},
};

interface NotificationProps {
  notification: NotificationData;
  onClose: (notification: NotificationData) => void;
}

function Notification({ notification, onClose }: NotificationProps) {
  const { variant, message } = notification;

  useEffect(() => {
    if (!message) return noop;

    const timerId = setTimeout(() => onClose(notifications.empty), 3000);

    return () => clearTimeout(timerId);
  }, [onClose, message]);

  if (!message) {
    return null;
  }

  return (
    <Alert
      color={alertVariantColor(variant)}
      variant="light"
      styles={darkThemeAlertStyles(variant)}
      style={{
        borderRadius: '0.25rem',
        boxShadow: 'var(--mantine-shadow-sm)',
        marginBottom: '0.5rem',
      }}
    >
      {message}
    </Alert>
  );
}

interface Tournament {
  id?: number;
  type?: string;
  name?: string;
  description?: string;
  creatorId?: number;
  moderatorIds?: number[];
  startsAt?: string;
  accessType?: string;
  taskProvider?: string;
  taskStrategy?: string;
  level?: string;
  taskPackName?: string;
  tags?: string;
  playersLimit?: number;
  roundsLimit?: number;
  timeoutMode?: string;
  roundTimeoutSeconds?: number | null;
  tournamentTimeoutSeconds?: number | null;
  breakDurationSeconds?: number;
  useChat?: boolean;
  useClan?: boolean;
  excludeBannedPlayers?: boolean;
  rankingType?: string;
  scoreStrategy?: string;
  meta?: Record<string, unknown>;
  creator?: { name?: string } | null;
  [key: string]: unknown;
}

export interface EditTournamentProps {
  tournamentId: string | number;
  taskPackNames?: string[];
  userTimezone?: string;
  onSuccess?: (tournament: TournamentResult) => void;
}

function EditTournament({
  tournamentId,
  taskPackNames = [],
  userTimezone = 'UTC',
  onSuccess,
}: EditTournamentProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<NotificationData>(notifications.empty);
  const browserTimezone = getBrowserTimezone(userTimezone);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await fetch(`/api/v1/tournaments/${tournamentId}`, {
          headers: {
            'x-csrf-token': window.csrf_token,
          } as HeadersInit,
        });
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = camelizeKeys(responseData);
        setTournament(data.tournament);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch tournament:', error);
        setErrors({ base: 'Failed to load tournament data' });
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId]);

  const handleSubmit = useCallback(
    async (formData: Record<string, unknown>) => {
      setIsSubmitting(true);
      setErrors({});
      setNotification(notifications.empty);

      try {
        const payload = {
          tournament: {
            ...formData,
            tournament_id: tournamentId,
            user_timezone: browserTimezone,
          },
        };

        const response = await fetch(`/api/v1/tournaments/${tournamentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': window.csrf_token,
          } as HeadersInit,
          body: JSON.stringify(decamelizeKeys(payload)),
        });
        const responseData = await response.json();

        if (!response.ok) {
          const error: ResponseError = new Error(`Request failed with status ${response.status}`);
          error.response = { data: responseData, status: response.status };
          throw error;
        }

        const data = camelizeKeys(responseData);

        // Update local tournament state
        if (data.tournament) {
          setTournament(data.tournament);
          setNotification(notifications.success);
          setIsSubmitting(false);

          if (onSuccess) {
            onSuccess(data.tournament);
          }
        }
      } catch (rawError) {
        setIsSubmitting(false);

        const error = rawError as ResponseError;

        if (error.response && error.response.data) {
          const errorData = camelizeKeys(error.response.data);

          if (errorData.errors) {
            setErrors(errorData.errors);
          } else if (errorData.error) {
            setNotification({ variant: 'danger', message: errorData.error });
          } else {
            setNotification(notifications.error);
          }
        } else {
          setNotification({
            variant: 'danger',
            message: 'Network error. Please try again.',
          });
        }
      }
    },
    [tournamentId, browserTimezone, onSuccess],
  );

  const handleValidate = useCallback(async () => {
    // Optional: Add client-side validation or call a validation endpoint
  }, []);

  if (loading) {
    return (
      <Paper
        bg="cbPanel"
        c="cbText"
        shadow="sm"
        py="lg"
        px={{ base: 'md', md: 'lg' }}
        mb="md"
        maw={1400}
        w="100%"
        mx="auto"
      >
        <Flex justify="center" align="center" style={{ minHeight: '400px' }}>
          <Loading />
        </Flex>
      </Paper>
    );
  }

  if (!tournament) {
    return (
      <Paper
        bg="cbPanel"
        c="cbText"
        shadow="sm"
        py="lg"
        px={{ base: 'md', md: 'lg' }}
        mb="md"
        maw={1400}
        w="100%"
        mx="auto"
      >
        <Alert color="red" role="alert">
          Tournament not found or you don&apos;t have permission to edit it.
        </Alert>
        <Button mt="sm" component="a" href="/tournaments" color="cbSecondary" radius="md">
          Back to Tournaments
        </Button>
      </Paper>
    );
  }

  const initialValues = {
    type: tournament.type || 'swiss',
    name: tournament.name || '',
    description: tournament.description || '',
    moderator_ids: (tournament.moderatorIds || []).join(', '),
    starts_at: formatDatetimeLocal(tournament.startsAt, browserTimezone),
    access_type: tournament.accessType || 'public',
    task_provider: tournament.taskProvider || 'level',
    task_strategy: tournament.taskStrategy || 'random',
    level: tournament.level || 'easy',
    task_pack_name: tournament.taskPackName || '',
    tags: tournament.tags || '',
    players_limit: tournament.playersLimit || 64,
    rounds_limit: tournament.roundsLimit || 7,
    timeout_mode: tournament.timeoutMode || 'per_task',
    round_timeout_seconds: tournament.roundTimeoutSeconds ?? null,
    tournament_timeout_seconds: tournament.tournamentTimeoutSeconds ?? null,
    break_duration_seconds: tournament.breakDurationSeconds || 42,
    use_chat: tournament.useChat !== undefined ? tournament.useChat : true,
    ranking_type: tournament.rankingType || 'by_user',
    score_strategy: tournament.scoreStrategy || '75_percentile',
    meta_json: tournament.meta ? JSON.stringify(decamelizeKeys(tournament.meta), null, 2) : '{}',
  };

  return (
    <Paper
      bg="cbPanel"
      c="cbText"
      shadow="sm"
      py="lg"
      px={{ base: 'md', md: 'lg' }}
      mb="md"
      maw={1400}
      w="100%"
      mx="auto"
    >
      <Notification notification={notification} onClose={setNotification} />
      <Title order={1} ta="center" mb="xs">
        {i18n.t('Edit Tournament')}
      </Title>
      <Title order={3} ta="center" mb="md" c="dimmed">
        {tournament.creator &&
          i18n.t('Creator: %{name}', {
            name: tournament.creator.name as string,
          })}
      </Title>
      <Grid justify="center">
        <Grid.Col span={{ base: 12, lg: 10, xl: 10 }}>
          <TournamentForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onValidate={handleValidate}
            errors={errors}
            isSubmitting={isSubmitting}
            submitButtonText={i18n.t('Update Tournament')}
            taskPackNames={taskPackNames}
            userTimezone={browserTimezone}
            showCancelButton
            cancelButtonText={i18n.t('Back')}
            onCancel={() => {
              window.location.href = `/tournaments/${tournamentId}`;
            }}
          />
        </Grid.Col>
      </Grid>
    </Paper>
  );
}

export default EditTournament;
