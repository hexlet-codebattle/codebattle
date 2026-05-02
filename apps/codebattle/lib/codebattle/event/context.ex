defmodule Codebattle.Event.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.GroupTournament
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Server
  alias Codebattle.User
  alias Codebattle.UserEvent
  alias Codebattle.UserEvent.Stage, as: UserEventStage

  require Logger

  # TODO: support per-stage weights for tournament_score and group_tournament_score
  # (e.g., final_score = w1 * score + w2 * group_tournament_score). For now both are summed equally.
  @spec calculate_places_for_stage(Event.t(), String.t()) :: {:ok, non_neg_integer()}
  def calculate_places_for_stage(event, stage_slug) do
    stages =
      UserEventStage
      |> join(:inner, [s], ue in UserEvent, on: s.user_event_id == ue.id)
      |> where([s, ue], ue.event_id == ^event.id and s.slug == ^stage_slug)
      |> preload(user_event: :user)
      |> Repo.all()

    scored =
      Enum.map(stages, fn stage ->
        total = (stage.score || 0) + (stage.group_tournament_score || 0)
        {stage, total}
      end)

    total_ranks =
      scored
      |> Enum.sort_by(fn {_, total} -> -total end)
      |> Enum.with_index(1)
      |> Map.new(fn {{stage, _}, rank} -> {stage.id, rank} end)

    category_ranks =
      scored
      |> Enum.group_by(fn {stage, _} -> stage.user_event.user.category end)
      |> Enum.flat_map(fn {_category, items} ->
        items
        |> Enum.sort_by(fn {_, total} -> -total end)
        |> Enum.with_index(1)
        |> Enum.map(fn {{stage, _}, rank} -> {stage.id, rank} end)
      end)
      |> Map.new()

    updated =
      Enum.reduce(scored, 0, fn {stage, _total}, acc ->
        case stage
             |> UserEventStage.changeset(%{
               place_in_total_rank: Map.get(total_ranks, stage.id),
               place_in_category_rank: Map.get(category_ranks, stage.id)
             })
             |> Repo.update() do
          {:ok, _} ->
            acc + 1

          {:error, changeset} ->
            Logger.error("calculate_places_for_stage failed for stage #{stage.id}: #{inspect(changeset.errors)}")

            acc
        end
      end)

    {:ok, updated}
  end

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
            start_single_stage(event, user, user_event, event_stage, tournament)

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

  defp start_single_stage(event, user, user_event, event_stage, tournament) do
    group_tournament_id = setup_individual_group_tournament(event, event_stage, user, tournament)
    tournament = link_group_tournament(tournament, group_tournament_id)

    Server.handle_event(tournament.id, :join, %{user: user})
    Server.handle_event(tournament.id, :start, %{run_via: :admin})

    UserEvent.mark_stage_as_started(
      user_event,
      event_stage.slug,
      tournament.id,
      group_tournament_id
    )

    {:ok, tournament}
  end

  defp setup_individual_group_tournament(event, event_stage, user, tournament) do
    case create_individual_group_tournament(event, event_stage, user) do
      {:ok, group_tournament} ->
        GroupTournament.Server.join(group_tournament.id, user, user.lang || "js")
        group_tournament.id

      {:error, reason} ->
        Logger.error(
          "Error creating individual group tournament for user #{user.id}, tournament #{tournament.id}: #{inspect(reason)}"
        )

        nil
    end
  end

  defp link_group_tournament(tournament, nil), do: tournament

  defp link_group_tournament(tournament, group_tournament_id) do
    Tournament
    |> where([t], t.id == ^tournament.id)
    |> Repo.update_all(set: [group_tournament_id: group_tournament_id])

    updated = %{tournament | group_tournament_id: group_tournament_id}
    Server.update_tournament(updated)
    updated
  end

  defp create_individual_group_tournament(event, event_stage, user) do
    meta = event_stage.group_tournament_meta || %{}
    now = DateTime.truncate(DateTime.utc_now(), :second)
    base_name = Map.get(meta, :name) || event_stage.name
    base_description = Map.get(meta, :description) || base_name

    attrs =
      meta
      |> Map.put(:event_id, event.id)
      |> Map.put(:name, "#{base_name} ##{user.id}")
      |> Map.put(:description, base_description)
      |> Map.put(:slug, "#{event.slug}-#{event_stage.slug}-#{user.id}-#{System.unique_integer([:positive])}")
      |> Map.put_new(:starts_at, now)
      |> Map.put_new(:state, "waiting_participants")
      |> Map.put_new(:rounds_count, 1)

    GroupTournament.Context.create_group_tournament(attrs)
  end
end
