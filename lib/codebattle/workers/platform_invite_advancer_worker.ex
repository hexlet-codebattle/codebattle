defmodule Codebattle.Workers.PlatformInviteAdvancerWorker do
  @moduledoc """
  Drives the platform invite state machine to a terminal state via Oban.

  Snooze cadence escalates with the poll count to balance freshness and load:
    polls   1–60  → 5s    (≈5 min)
    polls  61–240 → 10s   (≈30 min)
    polls 241–310 → 180s  (≈3.5 hours, once per 3 min)
  Total ≈ 4 hours of polling before the job is cancelled.

  Since Oban 2.24 a snooze no longer consumes an attempt (`attempt` is rolled
  back and `meta["snoozed"]` is incremented instead), so the poll count comes
  from `meta["snoozed"]`; `attempt` only grows on real errors.
  """

  use Oban.Worker,
    queue: :default,
    max_attempts: 10,
    unique: [
      keys: [:invite_id],
      states: [:available, :scheduled, :retryable, :executing, :suspended],
      period: :infinity
    ]

  alias Codebattle.ExternalPlatformInvite
  alias Codebattle.ExternalPlatformInvite.Advancer
  alias Codebattle.Repo
  alias Codebattle.User

  require Logger

  @terminal_states ~w(accepted failed expired)
  @max_polls 310

  @spec enqueue(ExternalPlatformInvite.t()) :: :ok
  def enqueue(%ExternalPlatformInvite{state: state} = invite) when state in @terminal_states do
    Logger.debug(
      "[PlatformInviteAdvancerWorker] enqueue skipped: invite_id=#{invite.id} already in terminal state=#{state}"
    )

    :ok
  end

  def enqueue(%ExternalPlatformInvite{id: invite_id, user_id: user_id}) do
    Logger.debug("[PlatformInviteAdvancerWorker] enqueue: invite_id=#{invite_id} user_id=#{user_id}")

    case %{invite_id: invite_id, user_id: user_id}
         |> new(schedule_in: 5)
         |> Oban.insert() do
      {:ok, job} ->
        Logger.debug(
          "[PlatformInviteAdvancerWorker] enqueue inserted job_id=#{inspect(job.id)} conflict=#{inspect(job.conflict?)} for invite_id=#{invite_id}"
        )

      {:error, reason} ->
        Logger.error("[PlatformInviteAdvancerWorker] enqueue failed for invite_id=#{invite_id}: #{inspect(reason)}")
    end

    :ok
  end

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"invite_id" => invite_id, "user_id" => user_id}, meta: meta}) do
    poll = Map.get(meta, "snoozed", 0) + 1
    Logger.debug("[PlatformInviteAdvancerWorker] perform: invite_id=#{invite_id} user_id=#{user_id} poll=#{poll}")

    with %ExternalPlatformInvite{} = invite <- Repo.get(ExternalPlatformInvite, invite_id),
         %User{} = user <- Repo.get(User, user_id) do
      run(invite, user, poll)
    else
      nil ->
        Logger.error(
          "[PlatformInviteAdvancerWorker] perform aborted: invite or user not found invite_id=#{invite_id} user_id=#{user_id}"
        )

        :ok
    end
  end

  defp run(%ExternalPlatformInvite{state: state} = invite, _user, poll) when state in @terminal_states do
    Logger.debug(
      "[PlatformInviteAdvancerWorker] run: invite_id=#{invite.id} already terminal state=#{state} poll=#{poll}"
    )

    :ok
  end

  defp run(invite, user, poll) do
    Logger.debug(
      "[PlatformInviteAdvancerWorker] run: advancing invite_id=#{invite.id} from state=#{invite.state} poll=#{poll}"
    )

    advanced = Advancer.advance(invite, user)

    Logger.debug(
      "[PlatformInviteAdvancerWorker] run: advanced invite_id=#{advanced.id} #{invite.state}->#{advanced.state} poll=#{poll}"
    )

    cond do
      advanced.state in @terminal_states ->
        Logger.debug(
          "[PlatformInviteAdvancerWorker] run: invite_id=#{advanced.id} reached terminal state=#{advanced.state}, stopping"
        )

        :ok

      poll >= @max_polls ->
        Logger.warning(
          "[PlatformInviteAdvancerWorker] run: invite_id=#{advanced.id} still state=#{advanced.state} after #{poll} polls, giving up"
        )

        {:cancel, :polling_window_exhausted}

      true ->
        snooze = snooze_seconds(poll)

        Logger.debug(
          "[PlatformInviteAdvancerWorker] run: invite_id=#{advanced.id} state=#{advanced.state} snoozing for #{snooze}s (poll=#{poll})"
        )

        {:snooze, snooze}
    end
  end

  defp snooze_seconds(poll) when poll <= 60, do: 5
  defp snooze_seconds(poll) when poll <= 240, do: 10
  defp snooze_seconds(_poll), do: 180
end
