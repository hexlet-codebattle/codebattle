defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats}
  import Ecto.Query, warn: false

  def stats(conn, %{"id" => id}) do
    stats = Stats.for_user(id)

    achievements =
      case id do
        "bot" ->
          [:bot]

        _user_id ->
          Repo.get(User, id).achievements
      end

    json(conn, %{achievements: achievements, stats: stats, user_id: id})
  end

  def index(conn, params) do
    page_number = Map.get(params, "page", "1")

    query = Codebattle.User.Scope.list_users_with_raiting(params)
    page = Repo.paginate(query, %{page: page_number})

    page_info = Map.take(page, [:page_number, :page_size, :total_entries, :total_pages])

    users =
      Enum.map(
        page.entries,
        fn user ->
          Map.put(
            user,
            :performance,
            Kernel.round((user.rating - 1200) * 100 / (user.games_played + 1))
          )
        end
      )

    json(conn, %{users: users, page_info: page_info})
  end

  # def index(conn, _params) do
  #  index(conn, %{"page" => 1})
  # end
end
