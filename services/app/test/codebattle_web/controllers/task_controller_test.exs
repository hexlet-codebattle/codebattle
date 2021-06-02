defmodule CodebattleWeb.TaskControllerTest do
  use CodebattleWeb.ConnCase, async: true

  test ".index", %{conn: conn} do
    insert_list(3, :task)

    conn = get(conn, Routes.task_path(conn, :index))

    assert conn.status == 200
  end

  test ".show", %{conn: conn} do
    task = insert(:task)

    conn = get(conn, Routes.task_path(conn, :show, task.id))

    assert conn.status == 200
  end
end
