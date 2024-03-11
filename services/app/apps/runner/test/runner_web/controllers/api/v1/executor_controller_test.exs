defmodule RunnerWeb.Api.V1.ExecutorControllerTest do
  use RunnerWeb.ConnCase, async: true

  describe ".execute" do
    test "without api_key", %{conn: conn} do
      conn
      |> post(Routes.api_v1_executor_path(conn, :execute, %{}))
      |> json_response(401)
    end

    test "invalid params 422", %{conn: conn} do
      conn
      |> put_req_header("x-auth-key", "x-key")
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
        |> put_req_header("x-auth-key", "x-key")
        |> post(Routes.api_v1_executor_path(conn, :execute), params)
        |> json_response(200)

      assert resp == %{
               "container_output" => "oi",
               "exit_code" => 0,
               "seed" => "blz",
               "container_stderr" => "blz"
             }
    end
  end
end
