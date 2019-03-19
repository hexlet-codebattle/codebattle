defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats, UserGame}
  import Ecto.Query, warn: false

  def stats(conn, %{"id" => id}) do
    stats = Stats.for_user(id)
    user = Repo.get(User, id)
    json(conn, %{achievements: user.achievements, stats: stats, user_id: id})
  end

  def index(conn, %{"page" => page_number}) do

     query = from(u in User,
       order_by: {:desc, :rating},
       join: ug in UserGame,
       on: u.id == ug.user_id,
       group_by: u.id,
       select: [u.name, u.id, u.rating, u.github_id, u.lang, count(ug.user_id)]
      )

     page =
         query
         |> Repo.paginate(%{page: page_number})

      users = Enum.map(page.entries,
                  fn([name, id, rating, github_id, lang, game_count]) ->
                     %{name: name, id: id, github_id: github_id, rating: rating, lang: lang, game_count: game_count} end)
      page_info = Map.take(page, [:page_number, :page_size, :total_entries, :total_pages])

  json(conn, %{users: users, page_info: page_info})
end

  def index(conn, _params) do
    index(conn, %{"page" => 1})
  end
end
