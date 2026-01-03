import React, { useState, useCallback } from 'react';

import axios from 'axios';
import { decamelizeKeys, camelizeKeys } from 'humps';

import TournamentForm from './TournamentForm';

function CreateTournament({ taskPackNames = [], userTimezone = 'UTC', onSuccess }) {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (formData) => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        tournament: {
          ...formData,
          user_timezone: userTimezone,
        },
      };

      const response = await axios.post(
        '/api/v1/tournaments',
        decamelizeKeys(payload),
        {
          headers: {
            'x-csrf-token': window.csrf_token,
          },
        },
      );

      const data = camelizeKeys(response.data);

      // Redirect to the tournament page on success
      if (data.tournament && data.tournament.id) {
        if (onSuccess) {
          onSuccess(data.tournament);
        } else {
          window.location.href = `/tournaments/${data.tournament.id}`;
        }
      }
    } catch (error) {
      setIsSubmitting(false);

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
  }, [userTimezone, onSuccess]);

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
            userTimezone={userTimezone}
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
