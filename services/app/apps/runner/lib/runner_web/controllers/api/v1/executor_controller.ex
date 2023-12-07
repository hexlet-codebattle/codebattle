defmodule RunnerWeb.Api.V1.ExecutorController do
  use RunnerWeb, :controller

  require Logger

  plug(RunnerWeb.AuthPlug)

  def execute(conn, %{
        "task" => task,
        "solution_text" => solution_text,
        "lang_slug" => lang_slug
      }) do
    runner_task = Runner.Task.new!(task)
    lang_meta = Runner.Languages.meta(lang_slug)

    {time, result} =
      :timer.tc(fn ->
        Runner.execute_solution(runner_task, lang_meta, solution_text)
      end)

    Logger.error("Runner.execute_solution lang: #{lang_slug} time_ms #{time / 1000} }")

    json(conn, result)
  end

  def execute(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: [:invalid_params]})
  end
end
