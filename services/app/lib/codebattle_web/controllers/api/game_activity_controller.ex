defmodule CodebattleWeb.Api.V1.GameActivityController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, Game}
  import Ecto.Query, only: [from: 2]

  defmacro to_char(field, format) do
    quote do
      fragment("to_char(?, ?)", unquote(field), unquote(format))
    end
  end

  def show(conn, %{}) do
    query =
      from(g in Game,
        group_by: to_char(g.inserted_at, "YYYY-mm-dd"),
        select: %{date: to_char(g.inserted_at, "YYYY-mm-dd"), count: count(g.id)}
      )

    activities = Repo.all(query)
    json(conn, %{activities: activities})
  end
end
