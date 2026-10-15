defmodule CodebattleWeb.PublicApi.V1.GameController do
  use CodebattleWeb, :controller

  import CodebattleWeb.PublicApi.V1.Helpers

  alias Codebattle.ApiAuditEvent
  alias Codebattle.Bot
  alias Codebattle.Game
  alias CodebattleWeb.Api.LobbyView
  alias CodebattleWeb.PublicApi.V1.ErrorJSON
  alias CodebattleWeb.PublicApi.V1.JSON
  alias CodebattleWeb.PublicApi.V1.Params

  @create_spec %{
    "level" => {{:enum, ~w(elementary easy medium hard)}, []},
    "task_id" => {:integer, range: {1, 2_147_483_647}},
    "task_name" => {:string, length: {1, 255}},
    "opponent" => {{:enum, ~w(bot link)}, required: true},
    "timeout_seconds" => {:integer, range: {60, 3600}}
  }

  @live_spec %{
    "state" => {{:enum, ~w(waiting_opponent playing)}, []}
  }

  plug(:require_scope, "read" when action in [:live])
  plug(:require_scope, "games:write" when action in [:create, :join, :cancel])

  # What the lobby shows: live non-tournament games you may see, newest first. Games waiting
  # for an opponent (often Codebot's) can be joined with `POST /games/{id}/join`;
  # `?state=waiting_opponent` lists only those.
  def live(conn, params) do
    user = conn.assigns.current_user

    case Params.validate(Map.delete(params, "format"), @live_spec) do
      {:ok, query} ->
        games =
          user
          |> LobbyView.render_active_games()
          |> Enum.filter(&(is_nil(query["state"]) or &1.state == query["state"]))
          |> Enum.sort_by(& &1.id, :desc)
          |> Enum.map(&JSON.game(&1, user.id))

        conn |> no_store() |> json(%{games: games, server_time: JSON.server_time()})

      {:error, errors} ->
        validation_failed(conn, errors)
    end
  end

  def create(conn, params) do
    user = conn.assigns.current_user

    with {:ok, body} <- Params.validate(Map.delete(params, "format"), @create_spec),
         {:ok, task} <- fetch_task(user, body),
         :ok <- check_level(body["level"], task),
         :ok <- check_quota(user) do
      game_params = %{
        level: body["level"],
        task: task,
        timeout_seconds: Map.get(body, "timeout_seconds", 600),
        players: players(body["opponent"], user),
        visibility_type: if(body["opponent"] == "link", do: "hidden", else: "public")
      }

      case Game.Context.create_game(game_params) do
        {:ok, game} ->
          ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, "game.create", "game", game.id)

          conn
          |> put_status(:created)
          |> json(%{
            game:
              game
              |> JSON.game(user.id)
              |> Map.put(:join_url, if(body["opponent"] == "link", do: JSON.url("/games/#{game.id}")))
          })

        {:error, reason} ->
          ErrorJSON.send_error(conn, 422, "validation_failed", to_string(reason))
      end
    else
      {:error, errors} -> validation_failed(conn, errors)
      {:quota, message} -> quota_exceeded(conn, message)
    end
  end

  # Joins a game that waits for an opponent: a lobby game from `GET /games/live`, or a
  # `link` game someone shared. Tournament games are joined by the tournament itself.
  def join(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    with {:ok, id} <- parse_id(id),
         {:ok, %{is_live: true, tournament_id: nil} = game} <- Game.Context.fetch_game(id),
         :ok <- if(game.state == "waiting_opponent", do: :ok, else: {:error, :not_waiting_opponent}),
         {:ok, _game} <- Game.Context.join_game(id, user),
         {:ok, game} <- Game.Context.fetch_game(id) do
      ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, "game.join", "game", id)
      json(conn, %{game: JSON.game(game, user.id)})
    else
      {:error, :not_waiting_opponent} ->
        join_failed(conn, "not_waiting_opponent", "The game is not waiting for an opponent")

      {:error, :already_in_a_game} ->
        join_failed_in_game(conn, id, Game.Auth.active_game_id(user.id))

      {:error, reason} when is_binary(reason) ->
        join_failed(conn, "not_waiting_opponent", "The game is not waiting for an opponent")

      {:error, reason} when is_atom(reason) and reason != :not_found ->
        join_failed(conn, to_string(reason), to_string(reason))

      _ ->
        ErrorJSON.not_found(conn)
    end
  end

  def cancel(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    with {:ok, id} <- parse_id(id),
         {:ok, game} <- Game.Context.fetch_game(id),
         true <- Game.Helpers.player?(game, user.id),
         :ok <- Game.Context.cancel_game(id, user) do
      ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, "game.cancel", "game", id)
      json(conn, %{game: %{id: id, state: "canceled"}})
    else
      {:error, :only_waiting_opponent} ->
        ErrorJSON.send_error(conn, 422, "validation_failed", "Only a game waiting for an opponent can be canceled")

      _ ->
        ErrorJSON.not_found(conn)
    end
  end

  # `details.reason` tells programs why a join failed; `details.active_game_id` points at the
  # game that blocks it, so a client can open or cancel that one.
  # `id` is the raw path param here: the parsed one doesn't reach the `else` of `with`.
  defp join_failed_in_game(conn, id, active_id) do
    if active_id && to_string(active_id) == to_string(id) do
      join_failed(conn, "already_joined", "You are already a player of this game", %{active_game_id: active_id})
    else
      join_failed(
        conn,
        "already_in_a_game",
        "You are already in another game; finish or cancel it first (POST /games/{id}/cancel)",
        %{active_game_id: active_id}
      )
    end
  end

  defp join_failed(conn, reason, message, extra \\ %{}),
    do: ErrorJSON.send_error(conn, 422, "validation_failed", message, Map.put(extra, :reason, reason))

  defp check_level(nil, nil), do: {:error, %{"level" => "is required unless task_id or task_name is given"}}
  defp check_level(level, task), do: check_task_level(level, task)

  defp players("bot", user), do: [user, Bot.Context.build()]
  defp players("link", user), do: [user]

  defp check_quota(user) do
    {per_minute, per_day} = Application.get_env(:codebattle, :public_api_game_quota, {5, 30})

    cond do
      ApiAuditEvent.count_since(user.id, "game.create", DateTime.add(DateTime.utc_now(), -1, :minute)) >= per_minute ->
        {:quota, "At most #{per_minute} games per minute"}

      ApiAuditEvent.count_since(user.id, "game.create", DateTime.add(DateTime.utc_now(), -1, :day)) >= per_day ->
        {:quota, "At most #{per_day} games per day"}

      true ->
        :ok
    end
  end
end
