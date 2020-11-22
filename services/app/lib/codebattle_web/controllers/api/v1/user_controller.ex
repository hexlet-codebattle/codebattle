defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats}
  alias CodebattleWeb.Api.GameView

  import Ecto.Query, warn: false

  def index(conn, params) do
    page_number = Map.get(params, "page", "1")

    page_size =
      params
      |> Map.get("page_size", "50")
      |> min("50")

    query = Codebattle.User.Scope.list_users_with_raiting(params)
    page = Repo.paginate(query, %{page: page_number, page_size: page_size})

    page_info = Map.take(page, [:page_number, :page_size, :total_entries, :total_pages])

    users =
      Enum.map(
        page.entries,
        fn user ->
          performance =
            if is_nil(user.rating) do
              nil
            else
              Kernel.round((user.rating - 1200) * 100 / (user.games_played + 1))
            end

          Map.put(user, :performance, performance)
        end
      )

    json(conn, %{
      users: users,
      page_info: page_info,
      date_from: Map.get(params, "date_from"),
      with_bots: Map.get(params, "with_bots")
    })
  end

  def show(conn, %{"id" => id}) do
    user = Repo.get(User, id)

    json(conn, %{user: user})
  end

  def stats(conn, %{"id" => id}) do
    game_stats = Stats.get_game_stats(id)
    rank = Stats.get_user_rank(id)

    completed_games =
      id
      |> Stats.get_completed_games()
      |> GameView.render_completed_games()

    user = Repo.get(User, id)

    json(conn, %{
      rank: rank,
      completed_games: completed_games,
      stats: game_stats,
      user: user
    })
  end
end
