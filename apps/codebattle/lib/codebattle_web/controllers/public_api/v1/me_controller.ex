defmodule CodebattleWeb.PublicApi.V1.MeController do
  use CodebattleWeb, :controller

  import CodebattleWeb.PublicApi.V1.Helpers
  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias CodebattleWeb.PublicApi.V1.JSON

  @page_size 50

  plug(:require_scope, "read")

  def show(conn, _params) do
    conn |> no_store() |> json(%{user: JSON.me(conn.assigns.current_user)})
  end

  # Polled by devices (gauntlets) and bots: `ends_at` with `server_time` is enough to
  # count down locally, e.g. to vibrate 10 minutes before the end.
  def active_game(conn, _params) do
    user = conn.assigns.current_user

    game =
      with game_id when not is_nil(game_id) <- Game.Context.get_active_game_id(user.id),
           {:ok, %{is_live: true, state: "playing"} = game} <- Game.Context.fetch_game(game_id) do
        JSON.game(game, user.id)
      else
        _ -> nil
      end

    conn |> no_store() |> json(%{game: game, server_time: JSON.server_time()})
  end

  # Keyset pagination: `next_cursor` is the id of the last game on the page; pass it back as
  # `cursor` for the next (older) page. `from`/`to` narrow the window by game start time.
  def games(conn, params) do
    user = conn.assigns.current_user

    case time_window(params) do
      {:ok, from, to} ->
        games =
          from(g in Game,
            where: fragment("? @> ARRAY[?]::integer[]", g.player_ids, ^user.id),
            where: g.state in ["game_over", "timeout"],
            order_by: [desc: g.id],
            limit: @page_size,
            preload: [:task]
          )
          |> before_cursor(params["cursor"])
          |> started_since(from)
          |> started_before(to)
          |> Repo.all()

        next_cursor = if length(games) == @page_size, do: games |> List.last() |> Map.get(:id)

        conn
        |> no_store()
        |> json(%{games: Enum.map(games, &JSON.game(&1, user.id)), next_cursor: next_cursor})

      {:error, errors} ->
        validation_failed(conn, errors)
    end
  end

  def tournaments(conn, params) do
    user = conn.assigns.current_user

    query =
      from(t in Tournament,
        where:
          t.creator_id == ^user.id or ^user.id in t.moderator_ids or
            fragment("((? #>> '{}')::jsonb) \\? ?", t.players, ^Integer.to_string(user.id)),
        order_by: [desc: t.id],
        limit: @page_size
      )

    query = if params["state"], do: where(query, [t], t.state == ^params["state"]), else: query

    tournaments = Enum.map(Repo.all(query), &JSON.tournament(&1, user))

    conn |> no_store() |> json(%{tournaments: tournaments})
  end

  defp time_window(params) do
    errors =
      for field <- ["from", "to"], params[field] && parse_time(params[field]) == :error, into: %{} do
        {field, "must be an ISO 8601 date or datetime"}
      end

    if errors == %{} do
      {:ok, parse_time(params["from"]), parse_time(params["to"])}
    else
      {:error, errors}
    end
  end

  defp parse_time(nil), do: nil

  defp parse_time(value) do
    case DateTime.from_iso8601(value) do
      {:ok, datetime, _offset} ->
        datetime

      _ ->
        case Date.from_iso8601(value) do
          {:ok, date} -> DateTime.new!(date, ~T[00:00:00])
          _ -> :error
        end
    end
  end

  defp started_since(query, nil), do: query
  defp started_since(query, from), do: where(query, [g], g.starts_at >= ^from)

  defp started_before(query, nil), do: query
  defp started_before(query, to), do: where(query, [g], g.starts_at < ^to)

  defp before_cursor(query, nil), do: query

  defp before_cursor(query, cursor) do
    case parse_id(cursor) do
      {:ok, id} -> where(query, [g], g.id < ^id)
      :error -> query
    end
  end
end
