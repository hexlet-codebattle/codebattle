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
  alias Codebattle.PubSub.Message
  alias Codebattle.Repo
  alias Codebattle.User

  require Logger

  @terminal_states ~w(accepted failed expired)

  @spec enqueue(ExternalPlatformInvite.t()) :: :ok
  def enqueue(%ExternalPlatformInvite{state: state} = invite) when state in @terminal_states do
    Logger.error(
      "[PlatformInviteAdvancerWorker] enqueue skipped: invite_id=#{invite.id} already in terminal state=#{state}"
    )

    :ok
  end

  def enqueue(%ExternalPlatformInvite{id: invite_id, user_id: user_id, group_tournament_id: tournament_id}) do
    Logger.error(
      "[PlatformInviteAdvancerWorker] enqueue: invite_id=#{invite_id} user_id=#{user_id} group_tournament_id=#{inspect(tournament_id)}"
    )

    case %{invite_id: invite_id, user_id: user_id, group_tournament_id: tournament_id}
         |> new(schedule_in: 3)
         |> Oban.insert() do
      {:ok, job} ->
        Logger.error(
          "[PlatformInviteAdvancerWorker] enqueue inserted job_id=#{inspect(job.id)} conflict=#{inspect(job.conflict?)} for invite_id=#{invite_id}"
        )

      {:error, reason} ->
        Logger.error("[PlatformInviteAdvancerWorker] enqueue failed for invite_id=#{invite_id}: #{inspect(reason)}")
    end

    :ok
  end

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"invite_id" => invite_id, "user_id" => user_id}, attempt: attempt}) do
    Logger.error("[PlatformInviteAdvancerWorker] perform: invite_id=#{invite_id} user_id=#{user_id} attempt=#{attempt}")

    with %ExternalPlatformInvite{} = invite <- Repo.get(ExternalPlatformInvite, invite_id),
         %User{} = user <- Repo.get(User, user_id) do
      run(invite, user, attempt)
    else
      nil ->
        Logger.error(
          "[PlatformInviteAdvancerWorker] perform aborted: invite or user not found invite_id=#{invite_id} user_id=#{user_id}"
        )

        :ok
    end
  end

  defp run(%ExternalPlatformInvite{state: state} = invite, _user, attempt) when state in @terminal_states do
    Logger.error(
      "[PlatformInviteAdvancerWorker] run: invite_id=#{invite.id} already terminal state=#{state} attempt=#{attempt}"
    )

    if state == "accepted", do: broadcast_accepted(invite)
    :ok
  end

  defp run(invite, user, attempt) do
    Logger.error(
      "[PlatformInviteAdvancerWorker] run: advancing invite_id=#{invite.id} from state=#{invite.state} attempt=#{attempt}"
    )

    advanced = Advancer.advance(invite, user)

    Logger.error(
      "[PlatformInviteAdvancerWorker] run: advanced invite_id=#{advanced.id} #{invite.state}->#{advanced.state} attempt=#{attempt}"
    )

    cond do
      advanced.state == "accepted" ->
        broadcast_accepted(advanced)
        :ok

      advanced.state in @terminal_states ->
        Logger.error(
          "[PlatformInviteAdvancerWorker] run: invite_id=#{advanced.id} reached terminal state=#{advanced.state}, stopping"
        )

        :ok

      true ->
        snooze = snooze_seconds(attempt)

        Logger.error(
          "[PlatformInviteAdvancerWorker] run: invite_id=#{advanced.id} state=#{advanced.state} snoozing for #{snooze}s (attempt=#{attempt})"
        )

        {:snooze, snooze}
    end
  end

  defp broadcast_accepted(%ExternalPlatformInvite{group_tournament_id: nil} = invite) do
    Logger.error(
      "[PlatformInviteAdvancerWorker] broadcast_accepted skipped: invite_id=#{invite.id} has no group_tournament_id"
    )

    :ok
  end

  defp broadcast_accepted(%ExternalPlatformInvite{} = invite) do
    payload = %{invite_id: invite.id, state: invite.state}

    user_topic = "group_tournament:#{invite.group_tournament_id}:user:#{invite.user_id}"
    tournament_topic = "group_tournament:#{invite.group_tournament_id}"

    Logger.error(
      "[PlatformInviteAdvancerWorker] broadcast_accepted: invite_id=#{invite.id} topics=[#{user_topic}, #{tournament_topic}]"
    )

    Enum.each([user_topic, tournament_topic], fn topic ->
      Phoenix.PubSub.broadcast(
        Codebattle.PubSub,
        topic,
        %Message{topic: topic, event: "group_tournament:invite_updated", payload: payload}
      )
    end)

    :ok
  end

  defp snooze_seconds(attempt) when attempt <= 140, do: 3
  defp snooze_seconds(attempt) when attempt <= 240, do: 5
  defp snooze_seconds(attempt) when attempt <= 340, do: 7
  defp snooze_seconds(_attempt), do: 9
end
