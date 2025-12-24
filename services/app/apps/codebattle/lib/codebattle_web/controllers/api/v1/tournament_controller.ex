defmodule CodebattleWeb.Api.V1.TournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.Tournament

  def index(conn, params) do
    current_user = conn.assigns.current_user

    filter = %{
      from: get_datetime(params["from"]) || DateTime.utc_now(),
      to: get_datetime(params["to"]) || DateTime.add(DateTime.utc_now(), 10, :day),
      user: current_user
    }

    season_tournaments = Tournament.Context.get_season_tournaments(filter)
    user_tournaments = Tournament.Context.get_user_tournaments(filter)
    json(conn, %{season_tournaments: season_tournaments, user_tournaments: user_tournaments})
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
    if tournament.creator_id == current_user.id || current_user.is_admin do
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
