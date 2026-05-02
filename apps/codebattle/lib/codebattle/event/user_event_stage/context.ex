defmodule Codebattle.UserEvent.Stage.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.UserEvent
  alias Codebattle.UserEvent.Stage
  alias Codebattle.Workers.SaveGroupTournamentResultsWorker
  alias Codebattle.Workers.SaveTournamentResultsWorker

  @spec save_tournament_results_async(integer()) :: {:ok, Oban.Job.t()} | {:error, term()}
  def save_tournament_results_async(tournament_id) do
    %{tournament_id: tournament_id}
    |> SaveTournamentResultsWorker.new()
    |> Oban.insert()
  end

  @spec save_group_tournament_results_async(integer()) :: {:ok, Oban.Job.t()} | {:error, term()}
  def save_group_tournament_results_async(group_tournament_id) do
    %{group_tournament_id: group_tournament_id}
    |> SaveGroupTournamentResultsWorker.new()
    |> Oban.insert()
  end

  @spec save_tournament_results(integer(), list(map())) :: :ok
  def save_tournament_results(event_id, player_results) do
    Enum.each(player_results, fn player_result ->
      with %UserEvent{} = user_event <- UserEvent.get_by_user_id_and_event_id(player_result.user_id, event_id),
           %Stage{} = stage <- Enum.find(user_event.stages, &(&1.tournament_id == player_result.tournament_id)) do
        stage
        |> Stage.changeset(%{
          wins_count: player_result.wins_count,
          games_count: player_result.games_count,
          score: player_result[:score],
          time_spent_in_seconds: player_result.time_spent_in_seconds,
          group_tournament_id: player_result[:group_tournament_id] || stage.group_tournament_id,
          tournament_finished: true
        })
        |> Repo.update()
      end
    end)

    :ok
  end

  @spec mark_stages_completed(integer(), integer()) :: :ok
  def mark_stages_completed(event_id, tournament_id) do
    now = DateTime.utc_now()

    Stage
    |> join(:inner, [s], ue in UserEvent, on: s.user_event_id == ue.id)
    |> where([s, ue], ue.event_id == ^event_id and s.tournament_id == ^tournament_id)
    |> Repo.update_all(set: [status: :completed, tournament_finished: true, finished_at: now])

    :ok
  end

  @spec mark_stages_completed_by_group_tournament(integer()) :: :ok
  def mark_stages_completed_by_group_tournament(group_tournament_id) do
    now = DateTime.utc_now()

    Stage
    |> where([s], s.group_tournament_id == ^group_tournament_id)
    |> Repo.update_all(set: [status: :completed, group_tournament_finished: true, finished_at: now])

    :ok
  end
end
