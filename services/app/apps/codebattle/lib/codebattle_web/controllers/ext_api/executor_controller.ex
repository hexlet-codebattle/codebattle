defmodule CodebattleWeb.ExtApi.ExecutorController do
  use CodebattleWeb, :controller

  import Plug.Conn

  alias Codebattle.CodeCheck.Executor.RemoteRust
  alias Runner.Languages

  require Logger

  plug(CodebattleWeb.Plugs.TokenAuth)

  def execute(conn, %{"task" => task, "solution_text" => solution_text, "lang_slug" => lang_slug}) do
    {execution_time, result} =
      :timer.tc(fn ->
        RemoteRust.execute(%{lang_slug: lang_slug, solution_text: solution_text, task: task}, Languages.meta(lang_slug))
      end)

    Logger.error("Proxy execution lang: #{lang_slug}, time: #{div(execution_time, 1_000)} msecs")

    case result do
      {:ok, result} ->
        json(conn, result)

      error ->
        conn
        |> put_status(:bad_request)
        |> json(%{errors: [inspect(error)]})
    end
  end

  def execute(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: [:invalid_params]})
  end
end
