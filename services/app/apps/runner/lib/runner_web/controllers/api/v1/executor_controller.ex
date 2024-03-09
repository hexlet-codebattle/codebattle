defmodule RunnerWeb.Api.V1.ExecutorController do
  use RunnerWeb, :controller

  plug(RunnerWeb.AuthPlug)

  require Logger

  def execute(conn, %{
        "task" => task,
        "solution_text" => solution_text,
        "lang_slug" => lang_slug
      }) do
    runner_task = Runner.Task.new!(task)
    lang_meta = Runner.Languages.meta(lang_slug)
    timeout_ms = Runner.Languages.get_timeout_ms(lang_meta)

    {:ok, run_id} = Runner.StateContainersRunLimiter.registry_container({lang_slug, timeout_ms})

    try do
      result = Runner.execute_solution(runner_task, lang_meta, solution_text, run_id)
      Runner.StateContainersRunLimiter.unregistry_container(run_id)

      json(conn, result)
    rescue
      e ->
        Logger.error(e)
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
