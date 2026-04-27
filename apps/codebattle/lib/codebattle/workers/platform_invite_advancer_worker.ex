defmodule Codebattle.Workers.PlatformInviteAdvancerWorker do
  @moduledoc """
  Drives the platform invite state machine to a terminal state via Oban.

  Replaces the previous in-process `Process.send_after` poller, which only ran
  while a user had the tournament channel open. This worker runs out-of-band,
  so an invite continues to advance even after the user disconnects.

  Snooze cadence escalates with attempt count to balance freshness and load:
    attempts   1–100 → 3s   (≈5 min)
    attempts 101–200 → 5s   (≈8 min)
    attempts 201–300 → 7s   (≈12 min)
    attempts 301–400 → 9s   (≈15 min)
  Total ≈ 40 minutes of polling before the job is discarded.
  """

  use Oban.Worker,
    queue: :default,
    max_attempts: 400,
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
  def enqueue(%ExternalPlatformInvite{state: state}) when state in @terminal_states, do: :ok

  def enqueue(%ExternalPlatformInvite{id: invite_id, user_id: user_id, group_tournament_id: tournament_id}) do
    %{invite_id: invite_id, user_id: user_id, group_tournament_id: tournament_id}
    |> new(schedule_in: 3)
    |> Oban.insert()

    :ok
  end

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"invite_id" => invite_id, "user_id" => user_id} = args, attempt: attempt}) do
    tournament_id = Map.get(args, "group_tournament_id")

    with %ExternalPlatformInvite{} = invite <- Repo.get(ExternalPlatformInvite, invite_id),
         %User{} = user <- Repo.get(User, user_id) do
      run(invite, user, tournament_id, attempt)
    else
      _ -> :ok
    end
  end

  defp run(%ExternalPlatformInvite{state: state} = invite, _user, tournament_id, _attempt)
       when state in @terminal_states do
    broadcast(invite, tournament_id)
    :ok
  end

  defp run(invite, user, tournament_id, attempt) do
    advanced = Advancer.advance(invite, user)
    broadcast(advanced, tournament_id)

    if advanced.state in @terminal_states do
      :ok
    else
      {:snooze, snooze_seconds(attempt)}
    end
  end

  defp snooze_seconds(attempt) when attempt <= 100, do: 3
  defp snooze_seconds(attempt) when attempt <= 200, do: 5
  defp snooze_seconds(attempt) when attempt <= 300, do: 7
  defp snooze_seconds(_attempt), do: 9

  defp broadcast(_invite, nil), do: :ok

  defp broadcast(%ExternalPlatformInvite{user_id: user_id} = invite, tournament_id) do
    message = %Message{
      topic: "group_tournament:#{tournament_id}:user:#{user_id}",
      event: "group_tournament:invite_updated",
      payload: %{invite_id: invite.id, state: invite.state}
    }

    Phoenix.PubSub.broadcast(Codebattle.PubSub, message.topic, message)
    :ok
  end
end
