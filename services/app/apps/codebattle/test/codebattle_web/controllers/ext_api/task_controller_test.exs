defmodule CodebattleWeb.ExtApi.TaskControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Repo
  alias Codebattle.Task

  describe "create/2" do
    test "checks auth", %{conn: conn} do
      payload = create_gzipped_payload([%{name: "test_task"}])

      assert conn
             |> post(Routes.ext_api_task_path(conn, :create, %{payload: payload}))
             |> json_response(401)
    end

    test "creates tasks with valid gzipped payload", %{conn: conn} do
      tasks_data = [
        %{
          name: "sum_of_two",
          description_en: "Calculate sum of two numbers",
          description_ru: "Вычислить сумму двух чисел",
          level: "easy",
          asserts: [
            %{arguments: [1, 1], expected: 2},
            %{arguments: [2, 3], expected: 5}
          ],
          input_signature: [
            %{argument_name: "a", type: %{name: "integer"}},
            %{argument_name: "b", type: %{name: "integer"}}
          ],
          output_signature: %{type: %{name: "integer"}},
          examples: "sum(1, 1) -> 2"
        },
        %{
          name: "multiply_numbers",
          description_en: "Multiply two numbers",
          description_ru: "Умножить два числа",
          level: "elementary",
          asserts: [
            %{arguments: [2, 3], expected: 6},
            %{arguments: [4, 5], expected: 20}
          ],
          input_signature: [
            %{argument_name: "x", type: %{name: "integer"}},
            %{argument_name: "y", type: %{name: "integer"}}
          ],
          output_signature: %{type: %{name: "integer"}},
          examples: "multiply(2, 3) -> 6"
        }
      ]

      payload = create_gzipped_payload(tasks_data)

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post(
          Routes.ext_api_task_path(conn, :create, %{
            payload: payload,
            origin: "github",
            visibility: "hidden"
          })
        )
        |> json_response(201)

      assert response["success"] == 2

      task1 = Repo.get_by(Task, name: "sum_of_two")
      assert task1
      assert task1.state == "active"
      assert task1.visibility == "hidden"
      assert task1.origin == "github"
      assert task1.level == "easy"
      assert task1.description_en == "Calculate sum of two numbers"
      assert length(task1.asserts) == 2

      task2 = Repo.get_by(Task, name: "multiply_numbers")
      assert task2
      assert task2.state == "active"
      assert task2.visibility == "hidden"
      assert task2.origin == "github"
      assert task2.level == "elementary"
    end

    test "updates existing tasks", %{conn: conn} do
      insert(:task,
        name: "existing_task",
        description_en: "Old description",
        level: "easy",
        origin: "github"
      )

      tasks_data = [
        %{
          name: "existing_task",
          description_en: "Updated description",
          description_ru: "Обновленное описание",
          level: "medium",
          asserts: [
            %{arguments: [1, 2], expected: 3}
          ],
          input_signature: [
            %{argument_name: "a", type: %{name: "integer"}},
            %{argument_name: "b", type: %{name: "integer"}}
          ],
          output_signature: %{type: %{name: "integer"}},
          examples: "updated examples"
        }
      ]

      payload = create_gzipped_payload(tasks_data)

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post(
          Routes.ext_api_task_path(conn, :create, %{
            payload: payload,
            origin: "github",
            visibility: "public"
          })
        )
        |> json_response(201)

      assert response["success"] == 1

      updated_task = Repo.get_by(Task, name: "existing_task")
      assert updated_task.description_en == "Updated description"
      assert updated_task.level == "medium"
      assert updated_task.visibility == "public"
    end

    test "handles partial failures gracefully", %{conn: conn} do
      tasks_data = [
        %{
          name: "valid_task",
          description_en: "Valid task",
          level: "easy",
          asserts: [
            %{arguments: [1, 1], expected: 2}
          ],
          input_signature: [
            %{argument_name: "a", type: %{name: "integer"}}
          ],
          output_signature: %{type: %{name: "integer"}},
          examples: "test"
        },
        %{
          name: "invalid_task"
          # Missing required fields
        }
      ]

      payload = create_gzipped_payload(tasks_data)

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post(
          Routes.ext_api_task_path(conn, :create, %{
            payload: payload,
            origin: "github",
            visibility: "public"
          })
        )
        |> json_response(400)

      assert response["success"] == 1
      assert is_list(response["errors"])
      assert length(response["errors"]) == 1

      # Valid task should be created
      assert Repo.get_by(Task, name: "valid_task")

      # Invalid task should not be created
      refute Repo.get_by(Task, name: "invalid_task")
    end

    test "returns error for invalid gzip payload", %{conn: conn} do
      invalid_payload = Base.encode64("not a gzipped data")

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post(
          Routes.ext_api_task_path(conn, :create, %{
            payload: invalid_payload,
            origin: "github",
            visibility: "public"
          })
        )
        |> json_response(400)

      assert response["errors"]["payload"] == "Invalid gzipped payload format"
    end

    test "returns error for invalid base64 encoding", %{conn: conn} do
      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post(
          Routes.ext_api_task_path(conn, :create, %{
            payload: "not-base64!!!",
            origin: "external_api",
            visibility: "public"
          })
        )
        |> json_response(400)

      assert response["errors"]["payload"] == "Invalid gzipped payload format"
    end

    test "returns error for invalid JSON in payload", %{conn: conn} do
      gzipped_data = :zlib.gzip("not valid json")
      payload = Base.encode64(gzipped_data)

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post(
          Routes.ext_api_task_path(conn, :create, %{
            payload: payload,
            origin: "external_api",
            visibility: "public"
          })
        )
        |> json_response(400)

      assert response["errors"]["payload"] == "Invalid gzipped payload format"
    end

    test "creates multiple tasks in batch", %{conn: conn} do
      tasks_data =
        Enum.map(1..10, fn i ->
          %{
            name: "batch_task_#{i}",
            description_en: "Batch task #{i}",
            level: "easy",
            asserts: [
              %{arguments: [i], expected: i * 2}
            ],
            input_signature: [
              %{argument_name: "x", type: %{name: "integer"}}
            ],
            output_signature: %{type: %{name: "integer"}},
            examples: "test #{i}"
          }
        end)

      payload = create_gzipped_payload(tasks_data)

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post(
          Routes.ext_api_task_path(conn, :create, %{
            payload: payload,
            origin: "github",
            visibility: "public"
          })
        )
        |> json_response(201)

      assert response["success"] == 10

      Enum.each(1..10, fn i ->
        task = Repo.get_by(Task, name: "batch_task_#{i}")
        assert task
        assert task.origin == "github"
      end)
    end
  end

  # Helper function to create gzipped and base64-encoded payload
  defp create_gzipped_payload(tasks_data) do
    tasks_data
    |> Jason.encode!()
    |> :zlib.gzip()
    |> Base.encode64()
  end
end
