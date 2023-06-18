defmodule CodebattleWeb.TaskPackControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test ".index", %{conn: conn} do
    user = insert(:user)
    insert_list(3, :task_pack)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.task_pack_path(conn, :index))

    assert conn.status == 200
  end

  test ".show", %{conn: conn} do
    user = insert(:user)
    admin = insert(:admin)
    visible_task_pack = insert(:task_pack, visibility: "public")
    hidden_task_pack = insert(:task_pack, visibility: "hidden")
    hidden_created_task_pack = insert(:task_pack, visibility: "hidden", creator_id: user.id)

    # guest redirected
    new_conn = get(conn, Routes.task_pack_path(conn, :show, visible_task_pack.id))

    assert new_conn.status == 302

    # user can see public tasks
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.task_pack_path(conn, :show, visible_task_pack))

    assert new_conn.status == 200

    # user can't see hidden tasks
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.task_pack_path(conn, :show, hidden_task_pack.id))

    assert new_conn.status == 404

    # user can see his hidden tasks
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.task_pack_path(conn, :show, hidden_created_task_pack.id))

    assert new_conn.status == 200

    # admin can see hidden tasks
    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get(Routes.task_pack_path(conn, :show, hidden_task_pack.id))

    assert new_conn.status == 200
  end

  test ".create", %{conn: conn} do
    user = insert(:user)

    params = %{
      "name" => "mega_pack",
      "task_ids" => " 1,  37,   42   ",
      "visibility" => "public"
    }

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> post(Routes.task_pack_path(conn, :create), task_pack: params)

    assert %{id: id} = redirected_params(conn)
    assert redirected_to(conn) == Routes.task_pack_path(conn, :show, id)

    conn = get(conn, Routes.task_pack_path(conn, :show, id))
    assert html_response(conn, 200)

    task_pack = Codebattle.TaskPack.get!(id)
    user_id = user.id

    assert %{
             creator_id: ^user_id,
             name: "mega_pack",
             task_ids: [1, 37, 42],
             visibility: "public",
             state: "draft"
           } = task_pack
  end

  test ".update", %{conn: conn} do
    user = insert(:user)
    task_pack = insert(:task_pack, creator_id: user.id)

    params = %{
      "name" => "new_mega_task_pack",
      "task_ids" => " 22",
      "visibility" => "public"
    }

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> patch(Routes.task_pack_path(conn, :update, task_pack), task_pack: params)

    assert %{id: id} = redirected_params(conn)
    assert redirected_to(conn) == Routes.task_pack_path(conn, :edit, id)

    task_pack = Codebattle.TaskPack.get!(id)

    assert %{name: "new_mega_task_pack", task_ids: [22]} = task_pack
  end

  test ".activate", %{conn: conn} do
    user = insert(:user)
    admin = insert(:admin)
    task_pack = insert(:task_pack, creator_id: user.id, state: "disabled")

    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> patch(Routes.task_pack_activate_path(conn, :activate, task_pack))

    assert new_conn.status == 404

    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> patch(Routes.task_pack_activate_path(conn, :activate, task_pack))

    assert redirected_to(new_conn) == Routes.task_pack_path(conn, :index)

    task_pack = Codebattle.TaskPack.get!(task_pack.id)

    assert task_pack.state == "active"
  end

  test ".disable", %{conn: conn} do
    user = insert(:user)
    admin = insert(:admin)
    task_pack = insert(:task_pack, creator_id: user.id, state: "active")

    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> patch(Routes.task_pack_disable_path(conn, :disable, task_pack))

    assert new_conn.status == 404

    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> patch(Routes.task_pack_disable_path(conn, :disable, task_pack))

    assert redirected_to(new_conn) == Routes.task_pack_path(conn, :index)

    task_pack = Codebattle.TaskPack.get!(task_pack.id)

    assert task_pack.state == "disabled"
  end

  test ".delete", %{conn: conn} do
    user = insert(:user)
    admin = insert(:admin)
    task_pack = insert(:task_pack, creator_id: admin.id, state: "active")

    # unrelated user
    new_conn =
      conn
      |> put_session(:user_id, user.id)
      |> delete(Routes.task_pack_path(conn, :delete, task_pack))

    assert new_conn.status == 404

    # admin or creator
    new_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> delete(Routes.task_pack_path(conn, :delete, task_pack))

    assert redirected_to(new_conn) == Routes.task_pack_path(conn, :index)
  end
end
