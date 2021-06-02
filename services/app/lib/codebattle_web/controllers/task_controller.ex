defmodule CodebattleWeb.TaskController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, Task}

  def index(conn, _params) do
    # TODO: add order by name, add played count to main table(join with group_by subquery)
    # use only visible tasks
    tasks = Repo.all(Task)

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • List of Tasks.",
      description: "List of Codebattle Tasks.",
      url: Routes.task_path(conn, :index)
    })
    |> render("index.html", %{tasks: tasks})
  end

  def show(conn, %{"id" => task_id}) do
    # use only visible tasks
    task = Repo.get!(Task, task_id)
    played_count = Task.get_played_count(task_id)

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Task.",
      description: "Codebattle Task.",
      url: Routes.task_path(conn, :show, task.id)
    })
    |> render("show.html", %{task: task, played_count: played_count})
  end
end
