defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats, User.Achievements}
  import Ecto.Query, warn: false

  def stats(conn, %{"id" => id}) do
    stats = Stats.for_user(id)
    query = from users in User, where: users.id == ^id
    data = Repo.all(query)
    achievements = Achievements.recalculate_achievements(List.first(data))
    json(conn, %{achievements: achievements, stats: stats, user_id: id })
  end
end
