defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats, User.Achievements}
  import Ecto.Query, warn: false

  def stats(conn, %{"id" => id}) do
    stats = Stats.for_user(id)

    achievements =
      case id do
        "bot" ->
          [:bot]

        user_id ->
          Repo.get(User, id).achievements
      end

    json(conn, %{achievements: achievements, stats: stats, user_id: id})
  end
end
