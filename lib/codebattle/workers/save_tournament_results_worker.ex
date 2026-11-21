defmodule Codebattle.Workers.SaveTournamentResultsWorker do
  @moduledoc false

  use Oban.Worker

  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.UserEvent.Stage, as: UserEventStage
  alias Codebattle.UserEvent.Stage.Context, as: StageContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"tournament_id" => tournament_id}}) do
    tournament = Tournament.Context.get!(tournament_id)
    event = Event.get!(tournament.event_id)
    event_stage = find_event_stage(event, tournament_id)

    if event_stage && event_stage.save_results != false do
      process_results(tournament)
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

  defp process_results(tournament) do
    user_results = Tournament.TournamentUserResult.get_by(tournament.id)

    player_results =
      Enum.map(user_results, fn result ->
        %{
          user_id: result.user_id,
          tournament_id: tournament.id,
          wins_count: result.wins_count,
          games_count: result.games_count,
          time_spent_in_seconds: result.total_time,
          score: result.score
        }
      end)

    StageContext.save_tournament_results(tournament.event_id, player_results)
    StageContext.mark_stages_completed(tournament.event_id, tournament.id)
  end
end
