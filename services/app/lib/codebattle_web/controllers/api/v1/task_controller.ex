defmodule CodebattleWeb.Api.V1.TaskController do
  use CodebattleWeb, :controller

  alias Codebattle.Task

  def index(conn, _) do
    tasks =
      conn.assigns.current_user
      |> Task.list_visible()
      |> Enum.map(&Map.take(&1, [:id, :level, :name, :origin, :tags, :creator_id]))

    json(conn, %{tasks: tasks})
  end
end
