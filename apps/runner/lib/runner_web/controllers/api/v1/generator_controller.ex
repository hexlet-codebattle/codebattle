defmodule RunnerWeb.Api.V1.GeneratorController do
  use RunnerWeb, :controller

  def generate(conn, %{
        "task" => task,
        "lang_slug" => lang_slug,
        "solution_text" => solution_text,
        "arguments_generator_text" => generator_text
      }) do
    runner_task = Runner.Task.new!(task)
    lang_meta = Runner.Languages.meta(lang_slug)

    result =
      Runner.generate_arguments(
        runner_task,
        lang_meta,
        solution_text,
        generator_text
      )

    json(conn, result)
  end

  def generate(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: [:invalid_params]})
  end
end
