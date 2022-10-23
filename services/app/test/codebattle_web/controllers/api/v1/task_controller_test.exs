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
end
