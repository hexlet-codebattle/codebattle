defmodule CodebattleWeb.TaskController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, Task}

  def index(conn, _params) do
    tasks = Repo.all(Task)
    
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • List of Tasks.",
      description: "List of Codebattle Tasks.",
      url: Routes.task_path(conn, :index)
    })
    |> assign(:tasks, tasks)
    |> render("index.html")
  end

  def show(conn, %{"id" => task_id}) do
    task = Repo.get!(Task, task_id)

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Task.",
      description: "Codebattle Task.",
      url: Routes.task_path(conn, :show, task.id)
    })
    |> assign(:task, task)
    |> render("show.html")
  end
end
