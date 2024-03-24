defmodule RunnerWeb.Api.V1.GeneratorControllerTest do
  use RunnerWeb.ConnCase, async: true

  describe ".generate" do
    test "invalid params 422", %{conn: conn} do
      conn
      |> post(Routes.api_v1_generator_path(conn, :generate, %{}))
      |> json_response(422)
    end

    test "asserts generator works", %{conn: conn} do
      task =
        %Runner.Task{
          asserts_examples: [
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
        "solution_text" => "asdf",
        "arguments_generator_text" => "asdf"
      }

      resp =
        conn
        |> post(Routes.api_v1_generator_path(conn, :generate), params)
        |> json_response(200)

      assert resp == %{"container_output" => "oi", "exit_code" => 0, "seed" => "blz"}
    end
  end
end
