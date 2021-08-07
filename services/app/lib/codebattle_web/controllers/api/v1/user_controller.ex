defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats}
  alias CodebattleWeb.Api.GameView

  import Ecto.Query, warn: false
  import PhoenixGon.Controller

  def index(conn, params) do
    page_number = Map.get(params, "page", "1")

    page_size =
      params
      |> Map.get("page_size", "50")

    query = Codebattle.User.Scope.list_users(params)
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
    games = Repo.all(from(games in UserGame, where: games.id == ^id))
    stats = User.Stats.for_user(id)
    rank = User.Stats.get_user_rank(id)

    json(conn, %{user: user, rank: rank, games: games, stats: stats})

    conn
    |> put_gon(id: id)
    |> render("show.html", user: user, rank: rank, games: games, stats: stats)
  end

  def create(conn, params) do
    user_attrs = %{
      name: params["name"],
      email: params["email"],
      passowrd: params["password"]
    }

    case Codebattle.Oauth.User.create_in_firebase(user_attrs) do
      {:ok, user} ->
        conn
        |> put_session(:user_id, user.id)
        |> json(%{status: :created})

      {:error, errors} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: errors})
    end
  end

  def stats(conn, %{"id" => id}) do
    game_stats = Stats.get_game_stats(id)

    completed_games =
      id
      |> Stats.get_completed_games()
      |> GameView.render_completed_games()

    user = Repo.get(User, id)

    json(conn, %{
      completed_games: completed_games,
      stats: game_stats,
      user: user
    })
  end

  def current(conn, _) do
    current_user = conn.assigns.current_user

    json(conn, %{id: current_user.id})
  end

  def lang_stats(conn, %{"id" => user_id}) do
    stats = Stats.lang_stats_for_user(user_id)

    json(conn, %{stats: stats})
  end
end
