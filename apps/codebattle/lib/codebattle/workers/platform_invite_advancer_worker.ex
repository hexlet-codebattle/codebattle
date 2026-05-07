defmodule Codebattle.Workers.PlatformInviteAdvancerWorker do
  @moduledoc """
  Drives the platform invite state machine to a terminal state via Oban.

  Replaces the previous in-process `Process.send_after` poller, which only ran
  while a user had the tournament channel open. This worker runs out-of-band,
  so an invite continues to advance even after the user disconnects.

  Snooze cadence escalates with attempt count to balance freshness and load:
    attempts   1–140 → 3s   (≈7 min)
    attempts 141–240 → 5s   (≈8 min)
    attempts 241–340 → 7s   (≈12 min)
    attempts 341–440 → 9s   (≈15 min)
  Total ≈ 42 minutes of polling before the job is discarded.
  """

  use Oban.Worker,
    queue: :default,
    max_attempts: 440,
    unique: [
      keys: [:invite_id],
      states: [:available, :scheduled, :retryable, :executing],
      period: :infinity
    ]

  alias Codebattle.ExternalPlatformInvite
  alias Codebattle.ExternalPlatformInvite.Advancer
  alias Codebattle.Repo
  alias Codebattle.User

  require Logger

  @terminal_states ~w(accepted failed expired)

  @spec enqueue(ExternalPlatformInvite.t()) :: :ok
  def enqueue(%ExternalPlatformInvite{state: state}) when state in @terminal_states, do: :ok

  def enqueue(%ExternalPlatformInvite{id: invite_id, user_id: user_id, group_tournament_id: tournament_id}) do
    %{invite_id: invite_id, user_id: user_id, group_tournament_id: tournament_id}
    |> new(schedule_in: 3)
    |> Oban.insert()

    :ok
  end

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"invite_id" => invite_id, "user_id" => user_id}, attempt: attempt}) do
    with %ExternalPlatformInvite{} = invite <- Repo.get(ExternalPlatformInvite, invite_id),
         %User{} = user <- Repo.get(User, user_id) do
      run(invite, user, attempt)
    else
      _ -> :ok
    end
  end

  defp run(%ExternalPlatformInvite{state: state}, _user, _attempt) when state in @terminal_states, do: :ok

  defp run(invite, user, attempt) do
    advanced = Advancer.advance(invite, user)

    if advanced.state in @terminal_states do
      :ok
    else
      {:snooze, snooze_seconds(attempt)}
    end
  end

  defp snooze_seconds(attempt) when attempt <= 140, do: 3
  defp snooze_seconds(attempt) when attempt <= 240, do: 5
  defp snooze_seconds(attempt) when attempt <= 340, do: 7
  defp snooze_seconds(_attempt), do: 9
end
