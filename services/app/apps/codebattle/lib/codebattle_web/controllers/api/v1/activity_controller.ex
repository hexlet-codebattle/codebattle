defmodule CodebattleWeb.Api.V1.ActivityController do
  use CodebattleWeb, :controller

  import Ecto.Query, only: [from: 2]

  alias Codebattle.Repo
  alias Codebattle.UserGame

  defmacro to_char(field, format) do
    quote do
      fragment("to_char(?, ?)", unquote(field), unquote(format))
    end
  end

  def show(conn, %{"user_id" => user_id}) do
    query =
      from(ug in UserGame,
        where: ug.user_id == ^user_id,
        where: ug.result in ["won", "lost", "gave_up"],
        group_by: to_char(ug.inserted_at, "YYYY-mm-dd"),
        select: %{date: to_char(ug.inserted_at, "YYYY-mm-dd"), count: count(ug.id)}
      )

    activities = Repo.all(query)
    json(conn, %{activities: activities})
  end
end
