defmodule CodebattleWeb.Api.V1.FeedbackControllerTest do
  use CodebattleWeb.ConnCase, async: true

  describe "index" do
    test "oiblz without auth", %{conn: conn} do
      conn
      |> get(Routes.api_v1_feedback_path(conn, :index))
      |> json_response(401)
    end

    test "lists feedback", %{conn: conn} do
      u1 = insert(:user)
      insert_list(3, :feedback)

      response =
        conn
        |> put_session(:user_id, u1.id)
        |> get(Routes.api_v1_feedback_path(conn, :index))
        |> json_response(200)

      assert Enum.count(response["feedback"]) == 3

      assert response["page_info"] == %{
               "page_number" => 1,
               "page_size" => 50,
               "total_entries" => 3,
               "total_pages" => 1
             }
    end
  end

  describe "create" do
    test "oiblz without auth", %{conn: conn} do
      conn
      |> post(Routes.api_v1_feedback_path(conn, :index))
      |> json_response(401)
    end

    test "creates feedback", %{conn: conn} do
      u1 = insert(:user)

      params = %{
        "attachments" => [
          %{
            "author_name" => "Dima",
            "fallback" => "Bug",
            "text" => "oiblz",
            "title_link" => "lol_kek"
          }
        ]
      }

      response =
        conn
        |> put_session(:user_id, u1.id)
        |> post(Routes.api_v1_feedback_path(conn, :index), params)
        |> json_response(201)

      assert %{
               "feedback" => %{
                 "author_name" => "Dima",
                 "id" => _,
                 "inserted_at" => _,
                 "status" => "Bug",
                 "text" => "oiblz",
                 "title_link" => "lol_kek"
               }
             } = response
    end
  end
end
