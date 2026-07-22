defmodule RunnerWeb.Api.V1.ExecutorControllerTest do
  use RunnerWeb.ConnCase, async: false

  setup do
    original_tmp = System.get_env("CODEBATTLE_RUNNER_TMP")
    test_tmp = Path.join(System.tmp_dir!(), "runner-controller-tests")
    System.put_env("CODEBATTLE_RUNNER_TMP", test_tmp)

    on_exit(fn ->
      File.rm_rf(test_tmp)

      if original_tmp do
        System.put_env("CODEBATTLE_RUNNER_TMP", original_tmp)
      else
        System.delete_env("CODEBATTLE_RUNNER_TMP")
      end
    end)
  end

  describe ".execute" do
    test "invalid params 422", %{conn: conn} do
      conn
      |> post(Routes.api_v1_executor_path(conn, :execute, %{}))
      |> json_response(422)
    end

    test "works", %{conn: conn} do
      task =
        %Runner.Task{
          asserts: [
            %{arguments: [1, 1], expected: 2},
            %{arguments: [2, 1], expected: 3},
            %{arguments: [3, 2], expected: 5}
          ],
          input_signature: [
            %{argument_name: "a", type: %{name: "integer"}},
            %{argument_name: "b", type: %{name: "integer"}}
          ],
          output_signature: %{type: %{name: "integer"}}
        }
        |> Jason.encode!()
        |> Jason.decode!()

      params = %{
        "task" => task,
        "lang_slug" => "js",
        "solution_text" => "asdf"
      }

      resp =
        conn
        |> post(Routes.api_v1_executor_path(conn, :execute), params)
        |> json_response(200)

      assert resp == %{
               "container_output" => "oi",
               "exit_code" => 0,
               "seed" => "blz",
               "container_stderr" => "blz"
             }
    end

    test "returns 422 when execution fails", %{conn: conn} do
      task = %{
        "type" => "sql",
        "input_signature" => [],
        "output_signature" => %{},
        "asserts" => [],
        "asserts_examples" => []
      }

      response =
        conn
        |> post(Routes.api_v1_executor_path(conn, :execute), %{
          "task" => task,
          "lang_slug" => "postgresql",
          "solution_text" => %{}
        })
        |> json_response(422)

      assert response == %{"errors" => ["failed_execute"]}
    end
  end
end
