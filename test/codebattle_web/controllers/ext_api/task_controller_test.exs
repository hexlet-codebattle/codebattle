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
          description_es: "Calcula la suma de dos números: «a» y «b».",
          description_zh: "计算两个数的和：a 和 b。",
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
          examples: "sum(1, 1) -> 2",
          examples_list: ["solution(1, 1) == 2", "solution(2, 3) == 5"]
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
      assert task1.description_es == "Calcula la suma de dos números: «a» y «b»."
      assert task1.description_zh == "计算两个数的和：a 和 b。"
      assert task1.examples_list == ["solution(1, 1) == 2", "solution(2, 3) == 5"]
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
        description_es: "Descripción anterior",
        description_zh: "原来的描述",
        level: "easy",
        origin: "github"
      )

      tasks_data = [
        %{
          name: "existing_task",
          description_en: "Updated description",
          description_ru: "Обновленное описание",
          description_es: "Descripción actualizada",
          description_zh: "更新后的描述",
          level: "medium",
          asserts: [
            %{arguments: [1, 2], expected: 3}
          ],
          input_signature: [
            %{argument_name: "a", type: %{name: "integer"}},
            %{argument_name: "b", type: %{name: "integer"}}
          ],
          output_signature: %{type: %{name: "integer"}},
          examples: "updated examples",
          examples_list: ["solution(1, 2) == 3"]
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
      assert updated_task.description_es == "Descripción actualizada"
      assert updated_task.description_zh == "更新后的描述"
      assert updated_task.level == "medium"
      assert updated_task.examples_list == ["solution(1, 2) == 3"]
      assert updated_task.visibility == "public"
    end

    test "preserves saved translations when older uploaders omit them", %{conn: conn} do
      task =
        insert(:task,
          name: "translated_upload",
          description_es: "Suma dos números",
          description_zh: "计算两个数的和"
        )

      params = valid_task(%{name: task.name})
      assert conn |> upload_tasks([params]) |> json_response(201) == %{"success" => 1}

      updated = Repo.get!(Task, task.id)
      assert updated.description_es == "Suma dos números"
      assert updated.description_zh == "计算两个数的和"

      params = Map.put(params, :description_es, "Nueva descripción")
      assert conn |> upload_tasks([params]) |> json_response(201) == %{"success" => 1}
      updated = Repo.get!(Task, task.id)
      assert updated.description_es == "Nueva descripción"
      assert updated.description_zh == "计算两个数的和"
      assert Repo.aggregate(Task, :count, :id) == 1
    end

    test "rejects uploads missing the runner signatures", %{conn: conn} do
      params = %{name: "minimal_upload"} |> valid_task() |> Map.drop([:input_signature, :output_signature])
      response = conn |> upload_tasks([params]) |> json_response(400)
      assert response["success"] == 0

      assert [%{"errors" => %{"input_signature" => "can't be blank", "output_signature" => "can't be blank"}}] =
               response["errors"]

      refute Repo.get_by(Task, name: params.name)
    end

    test "uploaded translations can be read through the task API", %{conn: conn} do
      params = valid_task(%{name: "readable_upload", description_es: "Suma", description_zh: "求和"})
      assert conn |> upload_tasks([params]) |> json_response(201) == %{"success" => 1}
      task = Repo.get_by!(Task, name: params.name)

      response = conn |> get(Routes.api_v1_task_path(conn, :show, task.id)) |> json_response(200)
      assert response["task"]["description_es"] == "Suma"
      assert response["task"]["description_zh"] == "求和"
      assert response["task"]["asserts"] == [%{"arguments" => [1, 2], "expected" => 3}]
    end

    test "rejects an incorrect upload key", %{conn: conn} do
      response =
        conn
        |> put_req_header("x-auth-key", "incorrect-key")
        |> post(Routes.ext_api_task_path(conn, :create), %{
          payload: create_gzipped_payload([valid_task()]),
          origin: "github",
          visibility: "public"
        })

      assert json_response(response, 401)
      assert Repo.aggregate(Task, :count, :id) == 0
    end

    test "rejects JSON that is not an array of task objects", %{conn: conn} do
      for invalid <- [nil, 42, "task", %{}, [nil], ["task"], [valid_task(), 42]] do
        response = conn |> upload_tasks(invalid) |> json_response(400)
        assert response["errors"]["payload"] == "Invalid gzipped payload format"
      end

      assert Repo.aggregate(Task, :count, :id) == 0
    end

    test "rejects non-string payloads", %{conn: conn} do
      for payload <- [42, [], %{}] do
        response =
          conn
          |> put_req_header("x-auth-key", "x-key")
          |> post(Routes.ext_api_task_path(conn, :create), %{
            payload: payload,
            origin: "github",
            visibility: "public"
          })
          |> json_response(400)

        assert response["errors"]["payload"] == "Invalid gzipped payload format"
      end
    end

    test "uploads the documented example", %{conn: conn} do
      tasks = "docs/examples/task-upload.json" |> File.read!() |> Jason.decode!()
      assert conn |> upload_tasks(tasks) |> json_response(201) == %{"success" => 1}
      task = Repo.get_by!(Task, name: "upload_example_sum")
      assert task.description_es == "Devuelve la suma de dos números."
      assert task.description_zh == "返回两个数的和。"
    end

    @tag :image_executor
    test "uploaded example runs in JavaScript and Python", %{conn: conn} do
      tasks = "docs/examples/task-upload.json" |> File.read!() |> Jason.decode!()
      assert conn |> upload_tasks(tasks) |> json_response(201) == %{"success" => 1}
      task = Repo.get_by!(Task, name: "upload_example_sum")

      for {language, solution} <- [
            {"js", "const solution = (a, b) => a + b; module.exports = solution;"},
            {"python", "def solution(a, b):\n    return a + b\n"}
          ] do
        assert %{status: "ok", success_count: 2, asserts_count: 2} =
                 Codebattle.CodeCheck.Checker.call(task, solution, language)
      end
    end

    test "reports invalid translations while uploading valid tasks in the batch", %{conn: conn} do
      response =
        conn
        |> upload_tasks([
          valid_task(%{name: "valid_translation", description_es: "Suma", description_zh: "求和"}),
          valid_task(%{name: "invalid_translation", description_zh: %{text: "求和"}})
        ])
        |> json_response(400)

      assert response["success"] == 1
      assert [%{"errors" => %{"description_zh" => "is invalid"}}] = response["errors"]
      assert Repo.get_by!(Task, name: "valid_translation").description_zh == "求和"
      refute Repo.get_by(Task, name: "invalid_translation")
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

    test "returns 404 when payload is missing", %{conn: conn} do
      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post(
          Routes.ext_api_task_path(conn, :create, %{
            origin: "external_api",
            visibility: "public",
            task: %{name: "direct-task"}
          })
        )
        |> json_response(404)

      assert response["errors"]["payload"] == "Payload not found"
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

  defp valid_task(attrs \\ %{}) do
    Map.merge(
      %{
        name: "uploaded_sum",
        description_en: "Return the sum of two numbers.",
        level: "easy",
        asserts: [%{arguments: [1, 2], expected: 3}],
        input_signature: [
          %{argument_name: "a", type: %{name: "integer"}},
          %{argument_name: "b", type: %{name: "integer"}}
        ],
        output_signature: %{type: %{name: "integer"}},
        examples: "solution(1, 2) == 3"
      },
      attrs
    )
  end

  defp upload_tasks(conn, tasks) do
    conn
    |> put_req_header("x-auth-key", "x-key")
    |> post(Routes.ext_api_task_path(conn, :create), %{
      payload: create_gzipped_payload(tasks),
      origin: "github",
      visibility: "public"
    })
  end

  # Helper function to create gzipped and base64-encoded payload
  defp create_gzipped_payload(tasks_data) do
    tasks_data
    |> Jason.encode!()
    |> :zlib.gzip()
    |> Base.encode64()
  end
end
