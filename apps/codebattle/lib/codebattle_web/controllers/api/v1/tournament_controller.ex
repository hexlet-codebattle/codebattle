defmodule CodebattleWeb.Api.V1.TournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.UserParams

  # Everything the Jason encoder exposes except secrets and runtime state.
  @public_fields [
    :access_type,
    :auto_redirect_to_game,
    :break_duration_seconds,
    :break_state,
    :creator_id,
    :current_round_id,
    :current_round_timeout_seconds,
    :current_round_position,
    :description,
    :event_id,
    :exclude_banned_players,
    :group_tournament_id,
    :grade,
    :id,
    :is_live,
    :last_round_ended_at,
    :last_round_started_at,
    :match_timeout_seconds,
    :moderator_ids,
    :name,
    :players_count,
    :players_limit,
    :ranking_type,
    :round_timeout_seconds,
    :rounds_limit,
    :score_strategy,
    :started_at,
    :starts_at,
    :state,
    :stats,
    :task_pack_name,
    :task_provider,
    :task_strategy,
    :timeout_mode,
    :tournament_timeout_seconds,
    :type,
    :use_chat,
    :use_clan,
    :use_event_ranking,
    :use_infinite_break,
    :use_timer
  ]

  def index(conn, params) do
    current_user = conn.assigns.current_user

    filter = %{
      from: get_datetime(params["from"]) || DateTime.utc_now(),
      to: get_datetime(params["to"]) || DateTime.add(DateTime.utc_now(), 30, :day),
      user: current_user
    }

    season_tournaments = Enum.map(Tournament.Context.get_season_tournaments(filter), &public_tournament/1)
    user_tournaments = Enum.map(Tournament.Context.get_user_tournaments(filter), &public_tournament/1)
    json(conn, %{season_tournaments: season_tournaments, user_tournaments: user_tournaments})
  end

  def history(conn, _params) do
    tournaments = Enum.map(Tournament.Context.get_finished_season_tournaments(), &history_item/1)

    json(conn, %{tournaments: tournaments})
  end

  def created(conn, params) do
    current_user = conn.assigns.current_user

    page_number = params |> Map.get("page", "1") |> String.to_integer()
    page_size = params |> Map.get("page_size", "20") |> String.to_integer()

    result = Tournament.Context.get_created_tournaments(current_user, page_number, page_size)
    total_pages = max(div(result.total_entries + page_size - 1, page_size), 1)

    page_info =
      result
      |> Map.take([:page_number, :page_size, :total_entries])
      |> Map.put(:total_pages, total_pages)

    json(conn, %{tournaments: Enum.map(result.entries, &created_item/1), page_info: page_info})
  end

  defp created_item(tournament) do
    %{
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      level: tournament.level,
      state: tournament.state,
      starts_at: tournament.starts_at
    }
  end

  def show(conn, %{"id" => id} = params) do
    current_user = conn.assigns.current_user
    tournament = Tournament.Context.get!(id)

    cond do
      Helpers.can_moderate?(tournament, current_user) ->
        json(conn, %{tournament: tournament})

      Helpers.can_access?(tournament, current_user, params) ->
        json(conn, %{tournament: public_tournament(tournament)})

      true ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "NOT_FOUND"})
    end
  end

  def create(conn, %{"tournament" => tournament_params}) do
    current_user = conn.assigns.current_user

    with {:ok, permitted_params} <- UserParams.permit(tournament_params, current_user),
         params =
           Map.merge(permitted_params, %{
             "creator" => current_user,
             "user_timezone" => Map.get(permitted_params, "user_timezone", "UTC")
           }),
         {:ok, tournament} <- Tournament.Context.create(params) do
      conn
      |> put_status(:created)
      |> json(%{tournament: tournament})
    else
      {:error, reason} -> render_error(conn, reason)
    end
  end

  def update(conn, %{"id" => id, "tournament" => tournament_params}) do
    current_user = conn.assigns.current_user
    tournament = Tournament.Context.get!(id)

    # Check if user has permission to update
    if Helpers.can_moderate?(tournament, current_user) do
      with {:ok, permitted_params} <- UserParams.permit(tournament_params, current_user, tournament),
           params = Map.put(permitted_params, "user_timezone", Map.get(permitted_params, "user_timezone", "UTC")),
           {:ok, tournament} <- Tournament.Context.update(tournament, params) do
        json(conn, %{tournament: tournament})
      else
        {:error, reason} -> render_error(conn, reason)
      end
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "You don't have permission to update this tournament"})
    end
  end

  defp history_item(tournament) do
    players = Map.values(tournament.players || %{})

    %{
      id: tournament.id,
      name: tournament.name,
      grade: tournament.grade,
      type: tournament.type,
      state: tournament.state,
      starts_at: tournament.starts_at,
      last_round_ended_at: tournament.last_round_ended_at,
      players_count: tournament.players_count,
      winner: find_winner(tournament, players)
    }
  end

  defp find_winner(%{winner_ids: [winner_id | _]}, players) when is_integer(winner_id) do
    case Enum.find(players, fn player -> player_field(player, :id) == winner_id end) do
      nil ->
        nil

      player ->
        %{
          id: player_field(player, :id),
          name: player_field(player, :name),
          avatar_url: player_field(player, :avatar_url)
        }
    end
  end

  defp find_winner(_tournament, _players), do: nil

  defp player_field(player, key) do
    Map.get(player, key) || Map.get(player, to_string(key))
  end

  defp get_datetime(nil), do: nil

  defp get_datetime(iso_datetime) do
    case DateTime.from_iso8601(iso_datetime) do
      {:ok, datetime, _} -> datetime
      {:error, _} -> nil
    end
  end

  defp public_tournament(tournament) do
    tournament
    |> Map.from_struct()
    |> Map.take(@public_fields)
  end

  defp render_error(conn, %Ecto.Changeset{} = changeset) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: format_errors(changeset)})
  end

  defp render_error(conn, errors) when is_map(errors) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: errors})
  end

  defp render_error(conn, reason) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{base: [to_string(reason)]}})
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
