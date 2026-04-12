defmodule Codebattle.Event.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Server
  alias Codebattle.User
  alias Codebattle.UserEvent

  require Logger

  @spec enroll_all_users_for_stage(Event.t(), String.t()) :: {:ok, non_neg_integer()}
  def enroll_all_users_for_stage(event, stage_slug) do
    non_bot_user_ids =
      User
      |> where([u], u.is_bot == false)
      |> select([u], u.id)
      |> Repo.all()

    existing_user_events =
      UserEvent
      |> where([ue], ue.event_id == ^event.id)
      |> preload(:stages)
      |> Repo.all()
      |> Map.new(&{&1.user_id, &1})

    enrolled_count =
      Enum.reduce(non_bot_user_ids, 0, fn user_id, count ->
        case Map.get(existing_user_events, user_id) do
          nil -> enroll_new_user(event, user_id, stage_slug, count)
          user_event -> maybe_enroll_existing_user(user_event, stage_slug, count)
        end
      end)

    {:ok, enrolled_count}
  end

  defp enroll_new_user(event, user_id, stage_slug, count) do
    {:ok, user_event} =
      UserEvent.create(%{user_id: user_id, event_id: event.id, status: "pending"})

    UserEvent.upsert_stages(user_event, [%{slug: stage_slug, status: :pending}])
    count + 1
  end

  defp maybe_enroll_existing_user(user_event, stage_slug, count) do
    if Enum.any?(user_event.stages, &(&1.slug == stage_slug)) do
      count
    else
      UserEvent.upsert_stages(user_event, build_stage_params(user_event, stage_slug))
      count + 1
    end
  end

  defp build_stage_params(user_event, stage_slug) do
    Enum.map(user_event.stages, &Map.from_struct/1) ++
      [%{slug: stage_slug, status: :pending}]
  end

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

    with false <- is_nil(event_stage),
         false <- is_nil(user_event_stage),
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
        tournament_params =
          Map.merge(event_stage.tournament_meta, %{
            type: "swiss",
            event_id: event.id,
            access_type: "token",
            use_chat: false,
            use_clan: false,
            state: "waiting_participants",
            break_duration_seconds: 5,
            grade: "open",
            name: event_stage.name,
            description: "#{event_stage.name} stage tournament",
            auto_redirect_to_game: true
          })

        case Tournament.Context.create(tournament_params) do
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
