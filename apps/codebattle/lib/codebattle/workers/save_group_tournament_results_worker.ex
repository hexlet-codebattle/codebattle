defmodule Codebattle.Workers.SaveGroupTournamentResultsWorker do
  @moduledoc false

  use Oban.Worker

  import Ecto.Query

  alias Codebattle.GroupTournament
  alias Codebattle.Repo
  alias Codebattle.UserEvent.Stage, as: UserEventStage
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserGroupTournamentRun

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"group_tournament_id" => group_tournament_id}}) do
    case Repo.get(GroupTournament, group_tournament_id) do
      %GroupTournament{event_id: event_id} = group_tournament when not is_nil(event_id) ->
        save_results(group_tournament)

      _ ->
        :ok
    end
  end

  defp save_results(%GroupTournament{id: group_tournament_id} = group_tournament) do
    now = DateTime.truncate(DateTime.utc_now(), :second)
    duration = duration_seconds(group_tournament)

    stages =
      UserEventStage
      |> where([s], s.group_tournament_id == ^group_tournament_id)
      |> preload(:user_event)
      |> Repo.all()

    case stages do
      [] -> :ok
      _ -> update_stages(stages, group_tournament_id, now, duration)
    end
  end

  defp update_stages(stages, group_tournament_id, now, duration) do
    scores_by_user_id = best_scores_for(group_tournament_id)

    Enum.each(stages, fn stage ->
      score = Map.get(scores_by_user_id, stage.user_event.user_id, 0)
      update_stage(stage, group_tournament_id, now, duration, score)
    end)

    :ok
  end

  defp update_stage(stage, group_tournament_id, now, duration, score) do
    result =
      stage
      |> UserEventStage.changeset(%{
        status: :completed,
        finished_at: now,
        group_tournament_finished: true,
        group_tournament_score: score,
        group_tournament_time_spent_in_seconds: duration
      })
      |> Repo.update()

    case result do
      {:ok, _} ->
        :ok

      {:error, changeset} ->
        Logger.error(
          "SaveGroupTournamentResultsWorker failed to update stage #{stage.id} for group_tournament #{group_tournament_id}: #{inspect(changeset.errors)}"
        )
    end
  end

  defp duration_seconds(%GroupTournament{started_at: %DateTime{} = started, finished_at: %DateTime{} = finished}) do
    finished |> DateTime.diff(started, :second) |> max(0)
  end

  defp duration_seconds(_), do: nil

  defp best_scores_for(group_tournament_id) do
    UserGroupTournamentRun
    |> join(:inner, [r], ugt in UserGroupTournament, on: ugt.id == r.user_group_tournament_id)
    |> where([r, _], r.group_tournament_id == ^group_tournament_id)
    |> group_by([_, ugt], ugt.user_id)
    |> select([r, ugt], {ugt.user_id, max(r.score)})
    |> Repo.all()
    |> Map.new(fn {user_id, score} -> {user_id, score || 0} end)
  end
end
