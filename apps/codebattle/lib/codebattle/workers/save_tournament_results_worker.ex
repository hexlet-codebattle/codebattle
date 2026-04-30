defmodule Codebattle.Workers.SaveTournamentResultsWorker do
  @moduledoc false

  use Oban.Worker

  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.GroupTournament
  alias Codebattle.Repo
  alias Codebattle.Tournament
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

  defp process_results(tournament, %{playing_type: :single} = event_stage, event) do
    user_results = Tournament.TournamentUserResult.get_by(tournament.id)

    player_results =
      Enum.map(user_results, fn result ->
        group_tournament_id =
          case create_individual_group_tournament(event, event_stage, result.user_id) do
            {:ok, gt} ->
              GroupTournament.Context.bulk_transfer_players(gt.id, [
                %{id: result.user_id, lang: result.user_lang}
              ])

              gt.id

            {:error, reason} ->
              Logger.error(
                "SaveTournamentResultsWorker: failed to create individual group tournament for user #{result.user_id}, tournament #{tournament.id}: #{inspect(reason)}"
              )

              nil
          end

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

  defp create_individual_group_tournament(event, event_stage, user_id) do
    meta = event_stage.group_tournament_meta || %{}
    now = DateTime.truncate(DateTime.utc_now(), :second)
    base_name = Map.get(meta, :name) || event_stage.name
    base_description = Map.get(meta, :description) || base_name

    attrs =
      meta
      |> Map.put(:creator_id, event.creator_id)
      |> Map.put(:event_id, event.id)
      |> Map.put(:name, "#{base_name} ##{user_id}")
      |> Map.put(:description, base_description)
      |> Map.put(:slug, "#{event.slug}-#{event_stage.slug}-#{user_id}-#{System.unique_integer([:positive])}")
      |> Map.put_new(:starts_at, now)
      |> Map.put_new(:state, "waiting_participants")
      |> Map.put_new(:rounds_count, 1)

    GroupTournament.Context.create_group_tournament(attrs)
  end
end
