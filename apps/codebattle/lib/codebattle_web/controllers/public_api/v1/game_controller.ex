defmodule CodebattleWeb.PublicApi.V1.GameController do
  use CodebattleWeb, :controller

  import CodebattleWeb.PublicApi.V1.Helpers

  alias Codebattle.ApiAuditEvent
  alias Codebattle.Bot
  alias Codebattle.Game
  alias CodebattleWeb.PublicApi.V1.ErrorJSON
  alias CodebattleWeb.PublicApi.V1.JSON
  alias CodebattleWeb.PublicApi.V1.Params

  @create_spec %{
    "level" => {{:enum, ~w(elementary easy medium hard)}, required: true},
    "opponent" => {{:enum, ~w(bot link)}, required: true},
    "timeout_seconds" => {:integer, range: {60, 3600}}
  }

  plug(:require_scope, "games:write")

  def create(conn, params) do
    user = conn.assigns.current_user

    with {:ok, body} <- Params.validate(Map.delete(params, "format"), @create_spec),
         :ok <- check_quota(user) do
      game_params = %{
        level: body["level"],
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
            game: %{
              id: game.id,
              url: JSON.url("/games/#{game.id}"),
              join_url: if(body["opponent"] == "link", do: JSON.url("/games/#{game.id}")),
              state: game.state
            }
          })

        {:error, reason} ->
          ErrorJSON.send_error(conn, 422, "validation_failed", to_string(reason))
      end
    else
      {:error, errors} -> validation_failed(conn, errors)
      {:quota, message} -> quota_exceeded(conn, message)
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
