defmodule CodebattleWeb.Api.V1.TaskController do
  use CodebattleWeb, :controller

  alias Codebattle.Task
  alias Codebattle.CodeCheck
  alias CodebattleWeb.Api.TaskView

  def index(conn, _) do
    tasks =
      conn.assigns.current_user
      |> Task.list_visible()

    json(conn, %{tasks: TaskView.render_tasks(tasks)})
  end

  def show(conn, %{"id" => id}) do
    case Task.get_task_by_id_for_user(conn.assigns.current_user, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "NOT_FOUND"})

      task ->
        json(conn, %{task: task})
    end
  end

  def new(conn, _) do
    task = Task.create_empty(conn.assigns.current_user.id)

    json(conn, %{task: task})
  end

  def build(conn, %{
        "task" => task_params,
        "solution_text" => solution_text,
        "arguments_generator_text" => arguments_generator_text,
        "editor_lang" => editor_lang
      }) do
    task = %Task{
      name: Map.get(task_params, "name"),
      asserts: Map.get(task_params, "asserts"),
      asserts_examples: Map.get(task_params, "asserts_examples"),
      input_signature: Map.get(task_params, "input_signature"),
      output_signature: Map.get(task_params, "output_signature")
    }

    case Codebattle.TaskForm.build(%{
           task: task,
           solution_text: solution_text,
           arguments_generator_text: arguments_generator_text,
           editor_lang: editor_lang
         }) do
      {:ok, asserts} ->
        conn
        |> json(%{status: "ok", asserts: asserts})

      {:failure, asserts} ->
        conn
        |> json(%{status: "failure", asserts: asserts})

      {:error, asserts, message} ->
        conn
        |> json(%{status: "error", asserts: asserts, message: message})
    end
  end

  def create(conn, %{"task" => task_params}) do
    case Codebattle.TaskForm.create(task_params, conn.assigns.current_user) do
      {:ok, task} ->
        json(conn, %{task: task})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:failure)
        |> json(%{error: "failure", changeset: changeset})
    end
  end

  def update(conn, %{"id" => id, "task" => task_params}) do
    task = Task.get!(id)

    if Task.can_access_task?(task, conn.assigns.current_user) do
      case Codebattle.TaskForm.update(task, task_params, conn.assigns.current_user) do
        {:ok, task} ->
          json(conn, %{task: task})

        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:failure)
          |> json(%{error: "failure", changeset: changeset})
      end
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "failure"})
    end
  end

  def delete(conn, %{"id" => id}) do
    task = Task.get!(id)

    if Task.can_delete_task?(task, conn.assigns.current_user) do
      Task.delete(task)

      json(conn, %{})
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "failure"})
    end
  end

  def check(conn, %{
        "task" => task_params,
        "editor_text" => solution_text,
        "lang_slug" => lang_slug
      }) do
    task = %Task{
      name: Map.get(task_params, "name"),
      asserts:
        task_params
        |> Map.get("asserts")
        |> Enum.map(fn assert_params ->
          %{
            arguments: Map.get(assert_params, "arguments"),
            expected: Map.get(assert_params, "expected")
          }
        end),
      input_signature: Map.get(task_params, "input_signature"),
      output_signature: Map.get(task_params, "output_signature")
    }

    check_result = CodeCheck.check_solution(task, solution_text, lang_slug)

    json(conn, %{check_result: check_result})
  end

  def unique(conn, %{"name" => name}) do
    json(conn, %{unique: Task.uniq?(name)})
  end
end
