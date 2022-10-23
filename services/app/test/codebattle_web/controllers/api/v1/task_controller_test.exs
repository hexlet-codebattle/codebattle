defmodule CodebattleWeb.Api.V1.TaskControllerTest do
  use CodebattleWeb.ConnCase, async: true

  describe "#index" do
    test "shows visible tasks without passing level", %{conn: conn} do
      visible_task = insert(:task, visibility: "public", level: "elementary")
      insert(:task, visibility: "hidden", level: "elementary")

      conn =
        conn
        |> get(Routes.api_v1_task_path(conn, :index))

      resp_body = json_response(conn, 200)

      assert Enum.count(resp_body["tasks"]) == 1

      assert resp_body["tasks"] == [
               %{
                 "id" => visible_task.id,
                 "name" => visible_task.name,
                 "descriptions" => %{
                   "en" => visible_task.description_en,
                   "ru" => visible_task.description_ru
                 },
                 "level" => visible_task.level,
                 "tags" => visible_task.tags
               }
             ]
    end

    test "shows visible tasks with passing level", %{conn: conn} do
      task = insert(:task, visibility: "public", level: "easy")

      conn =
        conn
        |> get(Routes.api_v1_task_path(conn, :index), %{"level" => "easy"})

      resp_body = json_response(conn, 200)

      assert Enum.count(resp_body["tasks"]) == 1

      assert resp_body["tasks"] == [
               %{
                 "id" => task.id,
                 "name" => task.name,
                 "descriptions" => %{"en" => task.description_en, "ru" => task.description_ru},
                 "level" => task.level,
                 "tags" => task.tags
               }
             ]
    end
  end

  describe "#show" do
    test "shows visible task", %{conn: conn} do
      task = insert(:task, visibility: "public", level: "easy")

      conn =
        conn
        |> get(Routes.api_v1_task_path(conn, :show, task.id))

      resp_body = json_response(conn, 200)

      assert resp_body == %{
               "id" => task.id,
               "name" => task.name,
               "descriptions" => %{"en" => task.description_en, "ru" => task.description_ru},
               "level" => task.level,
               "tags" => task.tags
             }
    end

    test "do not shows hidden task", %{conn: conn} do
      hidden_task = insert(:task, visibility: "hidden")

      conn =
        conn
        |> get(Routes.api_v1_task_path(conn, :show, hidden_task.id))

      resp_body = json_response(conn, 200)

      assert resp_body == %{}
    end
  end
end
