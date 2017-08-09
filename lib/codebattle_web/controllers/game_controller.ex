defmodule CodebattleWeb.GameController do
  use Codebattle.Web, :controller

  alias Codebattle.Play

  def index(conn, _params) do
    games = Play.list_games
    render(conn, "index.html", games: games)
  end

  def create(conn, %{}) do
    Play.create_game(conn.assigns.user)
    conn
    |> put_flash(:info, "Игра создана")
    |> redirect(to: game_path(conn, :index))
  end
end
