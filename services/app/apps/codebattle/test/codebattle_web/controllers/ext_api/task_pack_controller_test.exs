defmodule CodebattleWeb.ExtApi.TaskPackControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Repo
  alias Codebattle.TaskPack

  describe "create/2" do
    test "checks auth", %{conn: conn} do
      assert conn
             |> post(Routes.ext_api_task_pack_path(conn, :create, %{name: "qualification-2025"}))
             |> json_response(401)
    end

    test "creates task_pack with valid params", %{conn: conn} do
      task1 = insert(:task, name: "sum of two")
      task2 = insert(:task, name: "tasks")

      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(
        Routes.ext_api_task_pack_path(conn, :create, %{
          name: "qualification-2025",
          state: "active",
          visibility: "hidden",
          task_names: [
            "sum of two",
            "tasks"
          ]
        })
      )
      |> response(201)

      task_pack = Repo.get_by(TaskPack, name: "qualification-2025")
      assert task_pack
      assert task_pack.state == "active"
      assert task_pack.visibility == "hidden"
      assert task_pack.task_ids == [task1.id, task2.id]
    end

    test "updates existing task_pack", %{conn: conn} do
      task1 = insert(:task, name: "sum of two")
      task2 = insert(:task, name: "tasks")
      task3 = insert(:task, name: "missing numbers")

      task_pack = insert(:task_pack, name: "qualification-2025", task_ids: [task1.id])

      conn
      |> put_req_header("x-auth-key", "x-key")
      |> post(
        Routes.ext_api_task_pack_path(conn, :create, %{
          name: "qualification-2025",
          state: "active",
          visibility: "hidden",
          task_names: [
            "sum of two",
            "tasks",
            "missing numbers"
          ]
        })
      )
      |> response(201)

      updated_task_pack = Repo.get(TaskPack, task_pack.id)
      assert updated_task_pack
      assert updated_task_pack.state == "active"
      assert updated_task_pack.visibility == "hidden"
      assert updated_task_pack.task_ids == [task1.id, task2.id, task3.id]
    end
  end
end
