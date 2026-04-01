defmodule CodebattleWeb.FakeGroupTaskRunnerHttpClient do
  @moduledoc false

  def post(url, opts) do
    Process.put(:group_task_runner_last_request, %{url: url, opts: opts})
    Process.get(:group_task_runner_response, {:ok, %Req.Response{status: 200, body: %{"ok" => true}}})
  end
end
