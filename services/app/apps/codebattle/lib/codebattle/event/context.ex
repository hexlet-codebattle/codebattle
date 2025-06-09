defmodule Codebattle.Event.Context do
  @moduledoc false
  alias Codebattle.Event
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Server
  alias Codebattle.User
  alias Codebattle.UserEvent

  require Logger

  @spec start_stage_for_user(
          user :: User.t(),
          event_slug :: String.t(),
          stage_slug :: String.t()
        ) ::
          {:ok, Tournament.t()} | {:error, String.t()}
  def start_stage_for_user(user, event_slug, stage_slug) do
    event = Event.get_by_slug!(event_slug)
    event_stage = Event.get_stage(event, stage_slug)
    user_event = UserEvent.get_by_user_id_and_event_id(user.id, event.id)
    user_event_stage = UserEvent.get_stage(user_event, stage_slug)

    with true <- not is_nil(user_event),
         true <- not is_nil(event_stage),
         true <- not is_nil(user_event_stage),
         true <- event_stage.status in [:active],
         true <- user_event_stage.status in [:pending],
         {:ok, result} <-
           start_stage(
             event,
             user,
             user_event,
             event_stage
           ) do
      {:ok, result}
    else
      _ ->
        {:error, Gettext.gettext(CodebattleWeb.Gettext, "You already passed this stage")}
    end
  end

  defp start_stage(event, user, user_event, event_stage) do
    case event_stage do
      %Event.Stage{
        type: :tournament,
        status: :active,
        playing_type: :single
      } = event_stage ->
        case Tournament.Context.create(%{
               type: "swiss",
               event_id: event.id,
               access_type: "token",
               use_chat: false,
               use_clan: false,
               state: "waiting_participants",
               break_duration_seconds: 5,
               tournament_timeout_seconds: event_stage.tournament_meta.tournament_timeout_seconds,
               players_limit: event_stage.tournament_meta.players_limit,
               ranking_type: event_stage.tournament_meta.ranking_type,
               task_provider: event_stage.tournament_meta.task_provider,
               task_strategy: event_stage.tournament_meta.task_strategy,
               task_pack_name: event_stage.tournament_meta.task_pack_name,
               name: event_stage.name,
               meta: event_stage.tournament_meta
             }) do
          {:ok, tournament} ->
            Server.handle_event(tournament.id, :join, %{user: user})
            Server.handle_event(tournament.id, :start, %{run_via: :admin})

            UserEvent.mark_stage_as_started(
              user_event,
              event_stage.slug,
              tournament.id
            )

            {:ok, tournament}

          {:error, reason} ->
            Logger.error("Error starting tournament: #{inspect(reason)}")
            {:error, reason}
        end

      %Event.Stage{
        type: :tournament,
        tournament_id: tournament_id,
        status: :active,
        playing_type: :global
      } = event_stage ->
        Server.handle_event(tournament_id, :join, %{user: user})

        UserEvent.mark_stage_as_started(
          user_event,
          event_stage.slug,
          tournament_id
        )

        {:ok, tournament_id}

      %Event.Stage{} ->
        {:error, "Invalid event stage type"}
    end
  end
end
