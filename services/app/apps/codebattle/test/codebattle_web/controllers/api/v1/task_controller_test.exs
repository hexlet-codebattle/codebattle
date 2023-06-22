defmodule CodebattleWeb.Api.V1.TaskControllerTest do
  use CodebattleWeb.ConnCase, async: true

  describe ".index" do
    test "lists visible tasks", %{conn: conn} do
      u1 = insert(:user)
      u2 = insert(:user)

      t1 =
        insert(:task,
          creator_id: u1.id,
          state: "active",
          visibility: "hidden",
          name: "1",
          tags: ["a"]
        )

      t2 = insert(:task, creator_id: u2.id, state: "active", visibility: "public", name: "2")
      t3 = insert(:task, creator_id: nil, state: "active", visibility: "public", name: "3")
      insert(:task, creator_id: u2.id, state: "active", visibility: "hidden")
      insert(:task, creator_id: u2.id, state: "disabled", visibility: "public")

      tasks =
        conn
        |> put_session(:user_id, u1.id)
        |> get(Routes.api_v1_task_path(conn, :index))
        |> json_response(200)
        |> Map.get("tasks")
        |> Enum.sort_by(&Map.get(&1, "name"))

      assert [
               %{
                 "creator_id" => u1.id,
                 "id" => t1.id,
                 "level" => "easy",
                 "name" => "1",
                 "origin" => "user",
                 "tags" => ["a"]
               },
               %{
                 "creator_id" => u2.id,
                 "id" => t2.id,
                 "level" => "easy",
                 "name" => "2",
                 "origin" => "user",
                 "tags" => []
               },
               %{
                 "creator_id" => nil,
                 "id" => t3.id,
                 "level" => "easy",
                 "name" => "3",
                 "origin" => "user",
                 "tags" => []
               }
             ] ==
               tasks
    end
  end

  describe ".show" do
    test "shows visible task", %{conn: conn} do
      task = insert(:task, visibility: "public", level: "easy")

      conn =
        conn
        |> get(Routes.api_v1_task_path(conn, :show, task.id))

      resp_body = json_response(conn, 200)

      assert resp_body == %{
               "id" => task.id,
               "name" => task.name,
               "creator_id" => nil,
               "origin" => "user",
               "level" => task.level,
               "tags" => task.tags
             }
    end

    test "shows hidden task only for creator", %{conn: conn} do
      user = insert(:user)
      creator_id = user.id
      hidden_task = insert(:task, name: "1", visibility: "hidden", creator_id: creator_id)

      conn
      |> get(Routes.api_v1_task_path(conn, :show, hidden_task.id))
      |> json_response(404)

      response =
        conn
        |> put_session(:user_id, user.id)
        |> get(Routes.api_v1_task_path(conn, :show, hidden_task.id))
        |> json_response(200)

      assert %{
               "creator_id" => ^creator_id,
               "level" => "easy",
               "name" => "1",
               "origin" => "user",
               "tags" => []
             } = response
    end
  end

  describe ".unique" do
    test "returns false when task exists", %{conn: conn} do
      task = insert(:task, visibility: "public", level: "easy", name: "task_name")

      conn =
        conn
        |> post(Routes.api_v1_task_path(conn, :unique, task.name))

      resp_body = json_response(conn, 200)

      assert resp_body == %{"unique" => false}
    end

    test "returns true when task not exists", %{conn: conn} do
      conn =
        conn
        |> post(Routes.api_v1_task_path(conn, :unique, "my_unqiue_task"))

      resp_body = json_response(conn, 200)

      assert resp_body == %{"unique" => true}
    end
  end
end
