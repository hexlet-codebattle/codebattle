import React, { useState, useCallback, useMemo } from 'react';

import { decamelizeKeys, camelizeKeys } from 'humps';
import i18next from 'i18next';

import TournamentForm, { TournamentFormValues } from './TournamentForm';
import { getBrowserTimezone } from './dateTime';

interface TournamentResult {
  id: number;
  [key: string]: unknown;
}

type FormErrors = Partial<Record<string, string | string[]>> & { base?: string };

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
            setErrors({ base: 'An error occurred while creating the tournament' });
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
    <div className="cb-bg-panel cb-text cb-rounded shadow-sm p-3 p-md-4">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-2">
        <h4 className="mb-0">{i18next.t('Create a New Tournament')}</h4>
        {lastTournament && (
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
              onClick={applyLastTournament}
            >
              {i18next.t("Use my last tournament's settings")}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
              onClick={resetToDefaults}
            >
              {i18next.t('Reset to defaults')}
            </button>
          </div>
        )}
      </div>
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
    </div>
  );
}

export default CreateTournament;
