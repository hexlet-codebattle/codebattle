defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{User.Stats}

  def stats(conn, %{"id" => id}) do
    stats = Stats.for_user(id)
    json(conn, %{stats: stats, user_id: id})
  end
end
