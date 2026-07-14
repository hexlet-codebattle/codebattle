defmodule CodebattleWeb.TaskControllerTest do
  use CodebattleWeb.ConnCase, async: true

  import Inertia.Testing

  test ".index", %{conn: conn} do
    user = insert(:user)
    insert_list(3, :task)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.task_path(conn, :index))

    assert conn.status == 200
  end

  test ".show", %{conn: conn} do
    user = insert(:user)
    admin = insert(:admin)
    visible_task = insert(:task, visibility: "public")
    hidden_task = insert(:task, visibility: "hidden")
    hidden_created_task = insert(:task, visibility: "hidden", creator_id: user.id)

    # guest redirected
    new_conn = get(conn, Routes.task_path(conn, :show, visible_task.id))

    assert new_conn.status == 302

    # user can see public tasks
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.task_path(conn, :show, visible_task.id))

    assert new_conn.status == 200
    assert inertia_component(new_conn) == "TaskPreview"
    assert %{"task" => %{id: task_id}, "can_edit_task" => false} = inertia_props(new_conn)
    assert task_id == visible_task.id

    # user can't see hidden tasks
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.task_path(conn, :show, hidden_task.id))

    assert new_conn.status == 404

    # user can see his hidden tasks
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.task_path(conn, :show, hidden_created_task.id))

    assert new_conn.status == 200

    # admin can see hidden tasks
    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get(Routes.task_path(conn, :show, hidden_task.id))

    assert new_conn.status == 200
  end

  test ".activate", %{conn: conn} do
    user = insert(:user)
    admin = insert(:admin)
    task = insert(:task, creator_id: user.id, state: "disabled")

    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> patch(Routes.task_activate_path(conn, :activate, task))

    assert new_conn.status == 404

    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> patch(Routes.task_activate_path(conn, :activate, task))

    assert redirected_to(new_conn) == Routes.task_path(conn, :index)

    task = Codebattle.Task.get!(task.id)

    assert task.state == "active"
  end

  test ".disable", %{conn: conn} do
    user = insert(:user)
    admin = insert(:admin)
    task = insert(:task, creator_id: user.id, state: "active")

    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> patch(Routes.task_disable_path(conn, :disable, task))

    assert new_conn.status == 404

    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> patch(Routes.task_disable_path(conn, :disable, task))

    assert redirected_to(new_conn) == Routes.task_path(conn, :index)

    task = Codebattle.Task.get!(task.id)

    assert task.state == "disabled"
  end

  test ".delete", %{conn: conn} do
    user = insert(:user)
    admin = insert(:admin)
    task = insert(:task, creator_id: admin.id, state: "active", origin: "user")

    # unrelated user
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> delete(Routes.task_path(conn, :delete, task))

    assert new_conn.status == 404

    # admin or creator
    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> delete(Routes.task_path(conn, :delete, task))

    assert redirected_to(new_conn) == Routes.task_path(conn, :index)

    # task from github
    task = insert(:task, creator_id: admin.id, state: "active", origin: "github")

    # unrelated user
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> delete(Routes.task_path(conn, :delete, task))

    assert new_conn.status == 404

    # admin or creator
    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> delete(Routes.task_path(conn, :delete, task))

    assert new_conn.status == 404
  end
end
