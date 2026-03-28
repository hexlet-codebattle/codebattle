defmodule CodebattleWeb.Admin.GroupTaskControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.GroupTask.Context
  alias Codebattle.Repo

  test "admin can open group tasks index", %{conn: conn} do
    admin = insert(:admin)
    group_task = insert(:group_task, slug: "arena-1")

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get("/admin/group_tasks")

    assert html_response(conn, 200) =~ "Group Tasks"
    assert html_response(conn, 200) =~ group_task.slug
  end

  test "admin can create group task", %{conn: conn} do
    admin = insert(:admin)

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> post("/admin/group_tasks", %{
        "group_task" => %{"slug" => "spring-final", "time_to_solve_sec" => "900"}
      })

    assert redirected_to(conn) =~ "/admin/group_tasks/"

    group_task = Repo.get_by!(Codebattle.GroupTask, slug: "spring-final")
    assert group_task.time_to_solve_sec == 900
  end

  test "admin can generate token for group task user pair", %{conn: conn} do
    admin = insert(:admin)
    user = insert(:user)
    group_task = insert(:group_task)

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> post("/admin/group_tasks/#{group_task.id}/tokens", %{
        "group_task_token" => %{"user_id" => Integer.to_string(user.id)}
      })

    assert redirected_to(conn) == "/admin/group_tasks/#{group_task.id}"

    [token] = Context.list_tokens(group_task)
    assert token.user_id == user.id
    assert token.group_task_id == group_task.id
    assert is_binary(token.token)
  end
end
