defmodule RunnerWeb.Api.V1.ExecutorController do
  use RunnerWeb, :controller

  plug(RunnerWeb.AuthPlug)

  def execute(conn, %{
        "task" => task,
        "solution_text" => solution_text,
        "lang_slug" => lang_slug
      }) do
    runner_task = Runner.Task.new!(task)
    lang_meta = Runner.Languages.meta(lang_slug)

    {:ok, run_id} = Runner.StateContainersRunLimiter.registry_container(lang_slug)

    try do
      result = Runner.execute_solution(runner_task, lang_meta, solution_text, run_id)
      Runner.StateContainersRunLimiter.unregistry_container(run_id)

      json(conn, result)
    rescue
      _e ->
        Runner.StateContainersRunLimiter.unregistry_container(run_id)

        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: [:failed_execute]})
    end
  end

  def execute(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: [:invalid_params]})
  end
end
