defmodule RunnerWeb.Api.V1.ExecutorController do
  use RunnerWeb, :controller

  def execute(conn, %{
        "task" => task,
        "solution_text" => solution_text,
        "lang_slug" => lang_slug
      }) do
    task = Runner.Task.new!(task)
    lang_meta = Runner.Languages.meta(lang_slug)

    result = Runner.execute_solution(task, lang_meta, solution_text)

    json(conn, result)
  end

  def execute(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: [:invalid_params]})
  end
end
