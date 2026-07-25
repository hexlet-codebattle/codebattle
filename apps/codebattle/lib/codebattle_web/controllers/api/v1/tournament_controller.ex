defmodule CodebattleWeb.Api.V1.TournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def index(conn, params) do
    current_user = conn.assigns.current_user

    filter = %{
      from: get_datetime(params["from"]) || DateTime.utc_now(),
      to: get_datetime(params["to"]) || DateTime.add(DateTime.utc_now(), 30, :day),
      user: current_user
    }

    season_tournaments = Tournament.Context.get_season_tournaments(filter)
    user_tournaments = Tournament.Context.get_user_tournaments(filter)
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

  def show(conn, %{"id" => id}) do
    tournament = Tournament.Context.get!(id)

    json(conn, %{tournament: tournament})
  end

  def create(conn, %{"tournament" => tournament_params}) do
    current_user = conn.assigns.current_user

    params =
      Map.merge(
        tournament_params,
        %{
          "creator" => current_user,
          "user_timezone" => Map.get(tournament_params, "user_timezone", "UTC")
        }
      )

    case Tournament.Context.create(params) do
      {:ok, tournament} ->
        conn
        |> put_status(:created)
        |> json(%{tournament: tournament})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: format_errors(changeset)})
    end
  end

  def update(conn, %{"id" => id, "tournament" => tournament_params}) do
    current_user = conn.assigns.current_user
    tournament = Tournament.Context.get!(id)

    # Check if user has permission to update
    if Helpers.can_moderate?(tournament, current_user) do
      params =
        Map.put(
          tournament_params,
          "user_timezone",
          Map.get(tournament_params, "user_timezone", "UTC")
        )

      case Tournament.Context.update(tournament, params) do
        {:ok, tournament} ->
          json(conn, %{tournament: tournament})

        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{errors: format_errors(changeset)})
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

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
