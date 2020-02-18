defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats, UserGame}
  import Ecto.Query, warn: false

  def info(conn, %{"id" => id}) do
    user = Repo.get(User, id)

    json(conn, %{user: user})
  end

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
    filter = Map.get(params, "filter")

    subquery =
      from(u in User,
        order_by: {:desc, :rating},
        left_join: ug in UserGame,
        on: u.id == ug.user_id,
        group_by: u.id,
        select: %User{
          id: u.id,
          name: u.name,
          rating: u.rating,
          github_id: u.github_id,
          lang: u.lang,
          games_played: count(ug.user_id),
          rank: fragment("row_number() OVER(order by ? desc)", u.rating)
        }
      )

    query =
      case filter do
        nil ->
          subquery

        "" ->
          subquery

        _ ->
          from(t in subquery(subquery),
            where: ilike(t.name, ^"%#{filter}%")
          )
      end

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
