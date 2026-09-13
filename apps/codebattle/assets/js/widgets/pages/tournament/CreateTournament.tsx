import React, { useState, useCallback, useMemo } from 'react';

import { Button, Flex, Paper, Title } from '@mantine/core';

import { decamelizeKeys, camelizeKeys } from 'humps';
import i18next from 'i18next';

import TournamentForm, { TournamentFormValues } from './TournamentForm';
import { getBrowserTimezone } from './dateTime';

interface TournamentResult {
  id: number;
  [key: string]: unknown;
}

type FormErrors = Partial<Record<string, string | string[]>> & {
  base?: string;
};

interface ResponseErrorData {
  errors?: FormErrors;
  [key: string]: unknown;
}

interface ResponseError extends Error {
  response?: { data: ResponseErrorData; status: number };
}

// Shape shipped by TournamentController.index as the `last_tournament` prop
// (snake_case keys matching TournamentForm fields). Used to prefill the form.
export interface LastTournamentSettings {
  type?: string;
  name?: string;
  description?: string;
  access_type?: string;
  task_provider?: string;
  task_strategy?: string;
  level?: string;
  task_pack_name?: string | null;
  moderator_ids?: number[];
  players_limit?: number;
  rounds_limit?: number;
  timeout_mode?: string;
  round_timeout_seconds?: number | null;
  tournament_timeout_seconds?: number | null;
  break_duration_seconds?: number;
  use_chat?: boolean;
  ranking_type?: string;
  score_strategy?: string;
  meta?: Record<string, unknown> | null;
}

const toInitialValues = (last: LastTournamentSettings): Partial<TournamentFormValues> => {
  const { moderator_ids, meta, task_pack_name, ...rest } = last;

  return {
    ...rest,
    task_pack_name: task_pack_name || '',
    moderator_ids: Array.isArray(moderator_ids) ? moderator_ids.join(', ') : '',
    meta_json: meta && Object.keys(meta).length > 0 ? JSON.stringify(meta) : '{}',
  };
};

interface CreateTournamentProps {
  taskPackNames?: string[];
  userTimezone?: string;
  lastTournament?: LastTournamentSettings | null;
  onSuccess?: (tournament: TournamentResult) => void;
}

function CreateTournament({
  taskPackNames = [],
  userTimezone = 'UTC',
  lastTournament = null,
  onSuccess,
}: CreateTournamentProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Remounting the form (key bump) is how we reset its internally-seeded state
  // when the user prefills from a previous tournament or resets to defaults.
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState<Partial<TournamentFormValues>>({});
  const browserTimezone = useMemo(() => getBrowserTimezone(userTimezone), [userTimezone]);

  const applyLastTournament = useCallback(() => {
    if (!lastTournament) {
      return;
    }

    setInitialValues(toInitialValues(lastTournament));
    setFormKey((key) => key + 1);
  }, [lastTournament]);

  const resetToDefaults = useCallback(() => {
    setInitialValues({});
    setFormKey((key) => key + 1);
  }, []);

  const handleSubmit = useCallback(
    async (formData: Record<string, unknown>) => {
      setIsSubmitting(true);
      setErrors({});

      try {
        const payload = {
          tournament: {
            ...formData,
            user_timezone: browserTimezone,
          },
        };

        const response = await fetch('/api/v1/tournaments', {
          method: 'POST',
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

        // Redirect to the tournament page on success
        if (data.tournament && data.tournament.id) {
          if (onSuccess) {
            onSuccess(data.tournament);
          } else {
            window.location.href = `/tournaments/${data.tournament.id}`;
          }
        }
      } catch (rawError) {
        setIsSubmitting(false);
        const error = rawError as ResponseError;

        if (error.response && error.response.data) {
          const errorData = camelizeKeys(error.response.data);

          if (errorData.errors) {
            setErrors(errorData.errors);
          } else {
            setErrors({
              base: 'An error occurred while creating the tournament',
            });
          }
        } else {
          setErrors({ base: 'Network error. Please try again.' });
        }
      }
    },
    [browserTimezone, onSuccess],
  );

  const handleValidate = useCallback(async () => {
    // Optional: Add client-side validation or call a validation endpoint
    // For now, we'll rely on server-side validation
  }, []);

  return (
    <Paper bg="cbPanel" c="cbText" shadow="sm" p={{ base: 'md', md: 'lg' }}>
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        justify="space-between"
        align={{ base: 'flex-start', sm: 'center' }}
        mb="lg"
        gap={8}
      >
        <Title order={4}>{i18next.t('Create a New Tournament')}</Title>
        {lastTournament && (
          <Flex gap={8}>
            <Button
              size="compact-sm"
              variant="outline"
              color="cbSecondary"
              radius="md"
              onClick={applyLastTournament}
            >
              {i18next.t("Use my last tournament's settings")}
            </Button>
            <Button
              size="compact-sm"
              variant="outline"
              color="cbSecondary"
              radius="md"
              onClick={resetToDefaults}
            >
              {i18next.t('Reset to defaults')}
            </Button>
          </Flex>
        )}
      </Flex>
      <TournamentForm
        key={formKey}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onValidate={handleValidate}
        errors={errors}
        isSubmitting={isSubmitting}
        submitButtonText="Create Tournament"
        taskPackNames={taskPackNames}
        userTimezone={browserTimezone}
        showCancelButton
        cancelButtonText="Back"
        onCancel={() => {
          window.location.href = '/tournaments';
        }}
      />
    </Paper>
  );
}

export default CreateTournament;
