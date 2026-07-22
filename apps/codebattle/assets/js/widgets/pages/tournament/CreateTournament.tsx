import React, { useState, useCallback, useMemo } from 'react';

import { decamelizeKeys, camelizeKeys } from 'humps';

import TournamentForm from './TournamentForm';
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

interface CreateTournamentProps {
  taskPackNames?: string[];
  userTimezone?: string;
  onSuccess?: (tournament: TournamentResult) => void;
}

function CreateTournament({
  taskPackNames = [],
  userTimezone = 'UTC',
  onSuccess,
}: CreateTournamentProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const browserTimezone = useMemo(() => getBrowserTimezone(userTimezone), [userTimezone]);

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
    <div className="container-xl mx-auto cb-bg-panel cb-text shadow-sm cb-rounded py-4 mb-3">
      <h1 className="text-center mb-4">Create a New Tournament</h1>
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          <TournamentForm
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
      </div>
    </div>
  );
}

export default CreateTournament;
