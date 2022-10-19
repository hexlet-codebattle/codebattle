defmodule CodebattleWeb.Api.V1.TasksController do
  use CodebattleWeb, :controller

  alias Codebattle.Task

  def show(conn, _) do
    tasks = Task.list_visible(conn.assigns.current_user)

    json(conn, %{
      tasks: tasks
    })
  end
end
