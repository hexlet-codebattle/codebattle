defmodule Codebattle.Workers.SaveTournamentResultsWorker do
  @moduledoc false

  use Oban.Worker

  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.GroupTournament
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.UserEvent
  alias Codebattle.UserEvent.Stage, as: UserEventStage
  alias Codebattle.UserEvent.Stage.Context, as: StageContext

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"tournament_id" => tournament_id}}) do
    tournament = Tournament.Context.get!(tournament_id)
    event = Event.get!(tournament.event_id)
    event_stage = find_event_stage(event, tournament_id)

    if event_stage && event_stage.save_results != false do
      process_results(tournament, event_stage, event)
    end

    :ok
  end

  defp find_event_stage(event, tournament_id) do
    case Enum.find(event.stages, &(&1.tournament_id == tournament_id)) do
      nil ->
        slug =
          UserEventStage
          |> where([s], s.tournament_id == ^tournament_id)
          |> select([s], s.slug)
          |> limit(1)
          |> Repo.one()

        slug && Enum.find(event.stages, &(&1.slug == slug))

      stage ->
        stage
    end
  end

  defp process_results(tournament, %{playing_type: :single}, _event) do
    user_results = Tournament.TournamentUserResult.get_by(tournament.id)

    player_results =
      Enum.map(user_results, fn result ->
        %{
          user_id: result.user_id,
          tournament_id: tournament.id,
          wins_count: result.wins_count,
          games_count: result.games_count,
          time_spent_in_seconds: result.total_time,
          score: result.score,
          group_tournament_id: lookup_group_tournament_id(tournament.event_id, result.user_id, tournament.id)
        }
      end)

    StageContext.save_tournament_results(tournament.event_id, player_results)
  end

  defp process_results(tournament, event_stage, _event) do
    group_tournament_id = event_stage.group_tournament_id
    user_results = Tournament.TournamentUserResult.get_by(tournament.id)

    player_results =
      Enum.map(user_results, fn result ->
        %{
          user_id: result.user_id,
          tournament_id: tournament.id,
          wins_count: result.wins_count,
          games_count: result.games_count,
          time_spent_in_seconds: result.total_time,
          score: result.score,
          group_tournament_id: group_tournament_id
        }
      end)

    StageContext.save_tournament_results(tournament.event_id, player_results)

    if group_tournament_id do
      players = Enum.map(user_results, &%{id: &1.user_id, lang: &1.user_lang})
      GroupTournament.Context.bulk_transfer_players(group_tournament_id, players)

      Tournament.Context.update(tournament, %{
        "group_tournament_id" => group_tournament_id
      })
    else
      StageContext.mark_stages_completed(tournament.event_id, tournament.id)
    end
  end

  defp lookup_group_tournament_id(event_id, user_id, tournament_id) do
    with %UserEvent{} = user_event <- UserEvent.get_by_user_id_and_event_id(user_id, event_id),
         %UserEventStage{group_tournament_id: gt_id} <-
           Enum.find(user_event.stages, &(&1.tournament_id == tournament_id)) do
      gt_id
    else
      _ -> nil
    end
  end
end
