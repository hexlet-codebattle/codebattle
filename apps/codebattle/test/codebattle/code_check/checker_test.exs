defmodule Codebattle.CodeCheck.CheckerTest.ExecutorStub do
  @moduledoc false

  def call(token) do
    %{token | execution_error: RuntimeError.exception("executor failed")}
  end
end

defmodule Codebattle.CodeCheck.CheckerTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.CodeCheck.Checker
  alias Codebattle.CodeCheck.Result.V2

  setup do
    previous_executor = Application.get_env(:codebattle, :checker_executor)
    Application.put_env(:codebattle, :checker_executor, Codebattle.CodeCheck.CheckerTest.ExecutorStub)
    FunWithFlags.disable(:use_remote_zig_executor)

    on_exit(fn ->
      case previous_executor do
        nil -> Application.delete_env(:codebattle, :checker_executor)
        executor -> Application.put_env(:codebattle, :checker_executor, executor)
      end

      FunWithFlags.disable(:use_remote_zig_executor)
    end)

    :ok
  end

  test "handles struct result when building run error description" do
    task = insert(:task)

    assert %V2{status: "service_failure"} =
             Checker.call(task, "any_solution", "js", %{game_id: 1, user_id: 1})
  end
end
