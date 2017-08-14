defmodule CodebattleWeb.GameController do
  use Codebattle.Web, :controller

  plug :authenticate_user when action in [:index, :show]

  alias Codebattle.Game

  def index(conn, _params) do
    games = Play.Supervisor.current_games
    render(conn, "index.html", games: games)
  end

  def create(conn, %{}) do
    game_id = Codebattle.Play.create_game(conn.assigns.user)
    conn
    |> put_flash(:info, "Игра создана")
    |> redirect(to: game_path(conn, :show, game_id))
  end

  def show(conn, %{"id" => id}) do
    game =  Codebattle.Play.get_game!(id)
    {id, _} = Integer.parse(id)
    Play.Server.join(id, conn.assigns.user)
    render conn, "show.html", game: game
  end
end
