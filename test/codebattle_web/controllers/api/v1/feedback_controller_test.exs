defmodule CodebattleWeb.Api.V1.FeedbackControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Feedback
  alias Codebattle.Repo
  alias Codebattle.User

  describe "index" do
    test "oiblz without auth", %{conn: conn} do
      conn
      |> get(Routes.api_v1_feedback_path(conn, :index))
      |> json_response(401)
    end

    test "a user sees only their own feedback", %{conn: conn} do
      user = insert(:user)
      other = insert(:user)
      own = insert(:feedback, user_id: user.id, text: "mine")
      insert(:feedback, user_id: other.id, text: "someone else's")
      insert(:feedback, user_id: nil, text: "legacy, no sender")

      response =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_feedback_path(conn, :index))
        |> json_response(200)

      assert [%{"id" => id, "text" => "mine"}] = response["feedback"]
      assert id == own.id
      assert response["page_info"]["total_entries"] == 1
    end

    test "an admin sees all feedback", %{conn: conn} do
      admin = insert(:admin)
      insert(:feedback, user_id: insert(:user).id)
      insert(:feedback, user_id: nil)
      insert(:feedback, user_id: admin.id)

      response =
        conn
        |> log_in_user(admin.id)
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
      |> post(Routes.api_v1_feedback_path(conn, :create))
      |> json_response(401)
    end

    test "signs feedback with the sender from the session", %{conn: conn} do
      user = insert(:user)

      params = %{
        "attachments" => [
          %{
            "author_name" => "someone-else",
            "fallback" => "Bug",
            "text" => "oiblz",
            "title_link" => "lol_kek"
          }
        ]
      }

      response =
        conn
        |> log_in_user(user.id)
        |> post(Routes.api_v1_feedback_path(conn, :create), params)
        |> json_response(201)

      author_name = user.name
      user_id = user.id

      assert %{
               "feedback" => %{
                 "author_name" => ^author_name,
                 "user_id" => ^user_id,
                 "id" => _,
                 "inserted_at" => _,
                 "status" => "Bug",
                 "text" => "oiblz",
                 "title_link" => "lol_kek"
               }
             } = response
    end

    test "accepts messages longer than 255 characters", %{conn: conn} do
      user = insert(:user)
      text = String.duplicate("please delete my data. ", 40)

      params = %{"attachments" => [%{"fallback" => "Question", "text" => text, "title_link" => "/privacy"}]}

      conn
      |> log_in_user(user.id)
      |> post(Routes.api_v1_feedback_path(conn, :create), params)
      |> json_response(201)

      assert Repo.get_by!(Feedback, user_id: user.id).text == text
    end
  end

  test "archiving an account anonymizes the author of its feedback" do
    user = insert(:user, name: "RealName")
    feedback = insert(:feedback, user_id: user.id, author_name: "RealName")

    assert {:ok, archived} = User.archive(user)

    assert Repo.get!(Feedback, feedback.id).author_name == archived.name
    refute archived.name == "RealName"
  end
end
