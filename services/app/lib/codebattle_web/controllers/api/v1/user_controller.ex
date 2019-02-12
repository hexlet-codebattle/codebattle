defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats, User.Achievements}
  import Ecto.Query, warn: false

  def stats(conn, %{"id" => id}) do
    stats = Stats.for_user(id)
    user = Repo.get(User, id)
    json(conn, %{achievements: user.achievements, stats: stats, user_id: id })
  end
end
