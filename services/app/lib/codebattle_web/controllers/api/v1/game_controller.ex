defmodule CodebattleWeb.Api.V1.GameController do
  use CodebattleWeb, :controller
  # import CodebattleWeb.Gettext
  # import PhoenixGon.Controller
  require Logger

  alias Codebattle.GameProcess.Play

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:create])

  def create(conn, _params) do
    type = "private"

    case Play.create_game(conn.assigns.current_user, %{
           "level" => conn.params["level"],
           "type" => type
         }) do
      {:ok, id} ->
        conn
        |> json(%{game_id: id})

      {:error, _reason} ->
        conn
        |> json(%{error: "You are in a different game"})
    end
  end
end
