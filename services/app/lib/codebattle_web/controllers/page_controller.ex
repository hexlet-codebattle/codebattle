defmodule CodebattleWeb.PageController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, Game}
  alias Ecto.Query

  def index(conn, _params) do
    current_user = conn.assigns.current_user

    case current_user.guest do
      true ->
        render(conn, "index.html")

      false ->
        query =
          Query.from(
            games in Game,
            order_by: [desc: games.updated_at],
            where: [state: "game_over"],
            limit: 20,
            preload: :users
          )

        games = Repo.all(query)
        render(conn, "list.html", games: games)
    end
  end
end
