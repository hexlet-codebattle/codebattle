import React, { useState, useCallback, useEffect } from "react";

import axios from "axios";
import { decamelizeKeys, camelizeKeys } from "humps";
import noop from "lodash/noop";
import Alert from "react-bootstrap/Alert";

import Loading from "../../components/Loading";

import TournamentForm from "./TournamentForm";

const notifications = {
  success: { variant: "success", message: "Tournament updated successfully" },
  error: { variant: "danger", message: "Failed to update tournament" },
  empty: {},
};

function Notification({ notification, onClose }) {
  const { variant, message } = notification;

  useEffect(() => {
    if (!message) return noop;

    const timerId = setTimeout(() => onClose(notifications.empty), 3000);

    return () => clearTimeout(timerId);
  }, [onClose, message]);

  return (
    <Alert show={!!message} variant={variant}>
      {message}
    </Alert>
  );
}

function EditTournament({ tournamentId, taskPackNames = [], userTimezone = "UTC", onSuccess }) {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(notifications.empty);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await axios.get(`/api/v1/tournaments/${tournamentId}`, {
          headers: {
            "x-csrf-token": window.csrf_token,
          },
        });
        const data = camelizeKeys(response.data);
        setTournament(data.tournament);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch tournament:", error);
        setErrors({ base: "Failed to load tournament data" });
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId]);

  const handleSubmit = useCallback(
    async (formData) => {
      setIsSubmitting(true);
      setErrors({});
      setNotification(notifications.empty);

      try {
        const payload = {
          tournament: {
            ...formData,
            tournament_id: tournamentId,
            user_timezone: userTimezone,
          },
        };

        const response = await axios.put(
          `/api/v1/tournaments/${tournamentId}`,
          decamelizeKeys(payload),
          {
            headers: {
              "x-csrf-token": window.csrf_token,
            },
          },
        );

        const data = camelizeKeys(response.data);

        // Update local tournament state
        if (data.tournament) {
          setTournament(data.tournament);
          setNotification(notifications.success);
          setIsSubmitting(false);

          if (onSuccess) {
            onSuccess(data.tournament);
          }
        }
      } catch (error) {
        setIsSubmitting(false);

        if (error.response && error.response.data) {
          const errorData = camelizeKeys(error.response.data);

          if (errorData.errors) {
            setErrors(errorData.errors);
          } else if (errorData.error) {
            setNotification({ variant: "danger", message: errorData.error });
          } else {
            setNotification(notifications.error);
          }
        } else {
          setNotification({ variant: "danger", message: "Network error. Please try again." });
        }
      }
    },
    [tournamentId, userTimezone, onSuccess],
  );

  const handleValidate = useCallback(async () => {
    // Optional: Add client-side validation or call a validation endpoint
  }, []);

  if (loading) {
    return (
      <div
        className="w-100 mx-auto cb-bg-panel cb-text shadow-sm cb-rounded py-4 px-3 px-md-4 mb-3"
        style={{ maxWidth: "1100px" }}
      >
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <Loading />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div
        className="w-100 mx-auto cb-bg-panel cb-text shadow-sm cb-rounded py-4 px-3 px-md-4 mb-3"
        style={{ maxWidth: "1100px" }}
      >
        <div className="alert alert-danger" role="alert">
          Tournament not found or you don&apos;t have permission to edit it.
        </div>
        <a href="/tournaments" className="btn btn-secondary cb-btn-secondary cb-rounded">
          Back to Tournaments
        </a>
      </div>
    );
  }

  // Format starts_at for datetime-local input
  const formatDatetimeLocal = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const initialValues = {
    name: tournament.name || "",
    description: tournament.description || "",
    starts_at: formatDatetimeLocal(tournament.startsAt),
    access_type: tournament.accessType || "public",
    task_provider: tournament.taskProvider || "level",
    task_strategy: tournament.taskStrategy || "random",
    level: tournament.level || "easy",
    task_pack_name: tournament.taskPackName || "",
    tags: tournament.tags || "",
    players_limit: tournament.playersLimit || 64,
    rounds_limit: tournament.roundsLimit || 7,
    round_timeout_seconds: tournament.roundTimeoutSeconds ?? null,
    break_duration_seconds: tournament.breakDurationSeconds || 42,
    use_chat: tournament.useChat !== undefined ? tournament.useChat : true,
    use_clan: tournament.useClan !== undefined ? tournament.useClan : false,
    ranking_type: tournament.rankingType || "by_user",
    score_strategy: tournament.scoreStrategy || "75_percentile",
    meta_json: tournament.meta ? JSON.stringify(tournament.meta, null, 2) : "{}",
  };

  return (
    <div
      className="w-100 mx-auto cb-bg-panel cb-text shadow-sm cb-rounded py-4 px-3 px-md-4 mb-3"
      style={{ maxWidth: "1100px" }}
    >
      <Notification notification={notification} onClose={setNotification} />
      <h1 className="text-center mb-2">Edit Tournament</h1>
      <h3 className="text-center mb-4 text-muted">
        {tournament.creator && <>Creator: {tournament.creator.name}</>}
      </h3>
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-7">
          <TournamentForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onValidate={handleValidate}
            errors={errors}
            isSubmitting={isSubmitting}
            submitButtonText="Update Tournament"
            taskPackNames={taskPackNames}
            userTimezone={userTimezone}
            showCancelButton
            cancelButtonText="Back"
            onCancel={() => {
              window.location.href = `/tournaments/${tournamentId}`;
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default EditTournament;
