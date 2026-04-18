defmodule Codebattle.Workers.SaveTournamentResultsWorker do
  @moduledoc false

  use Oban.Worker

  alias Codebattle.Event
  alias Codebattle.GroupTournament
  alias Codebattle.Tournament
  alias Codebattle.UserEvent.Stage.Context, as: StageContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"tournament_id" => tournament_id}}) do
    tournament = Tournament.Context.get!(tournament_id)
    event = Event.get!(tournament.event_id)
    event_stage = Enum.find(event.stages, &(&1.tournament_id == tournament_id))

    if event_stage && event_stage.save_results != false do
      process_results(tournament, event_stage)
    end

    :ok
  end

  defp process_results(tournament, event_stage) do
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
end
