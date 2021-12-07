defmodule CodebattleWeb.TaskControllerTest do
  use CodebattleWeb.ConnCase, async: true

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

  test ".create", %{conn: conn} do
    user = insert(:user)

    params = %{
      "asserts" => ~s([{"arguments":[1,1],"expected":2}, {"arguments":[1,1],"expected":2}]),
      "description_en" => "test sum: for ruby",
      "description_ru" => "проверка суммирования: для руби",
      "examples" => "```\n2 == solution(1,1)\n10 == solution(9,1)\n```",
      "input_signature" =>
        ~s([{"argument-name":"a","type":{"name":"integer"}},{"argument-name":"b","type":{"name":"integer"}}]),
      "level" => "easy",
      "name" => "asdfasdf",
      "output_signature" => ~s({"type":{"name":"integer"}}),
      "tags" => " kek,lol, asdf    "
    }

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> post(Routes.task_path(conn, :create), task: params)

    assert %{id: id} = redirected_params(conn)
    assert redirected_to(conn) == Routes.task_path(conn, :show, id)

    conn = get(conn, Routes.task_path(conn, :show, id))
    assert html_response(conn, 200)

    task = Codebattle.Task.get!(id)
    user_id = user.id

    assert %{
             asserts: [
               %{arguments: [1, 1], expected: 2},
               %{arguments: [1, 1], expected: 2}
             ],
             creator_id: ^user_id,
             description_en: "test sum: for ruby",
             description_ru: "проверка суммирования: для руби",
             examples: "```\n2 == solution(1,1)\n10 == solution(9,1)\n```",
             input_signature: [
               %{"argument-name" => "a", "type" => %{"name" => "integer"}},
               %{"argument-name" => "b", "type" => %{"name" => "integer"}}
             ],
             level: "easy",
             name: "asdfasdf",
             origin: "user",
             output_signature: %{"type" => %{"name" => "integer"}},
             state: "draft",
             tags: ["kek", "lol", "asdf"],
             visibility: "public"
           } = task
  end

  test ".update", %{conn: conn} do
    user = insert(:user)
    task = insert(:task, creator_id: user.id)

    params = %{
      "asserts" => ~s([{"arguments":[1,1],"expected":2}, {"arguments":[1,1],"expected":2}]),
      "description_en" => "test sum: for ruby",
      "description_ru" => "проверка суммирования: для руби",
      "examples" => "```\n2 == solution(1,1)\n10 == solution(9,1)\n```",
      "input_signature" =>
        "[{\"argument-name\":\"a\",\"type\":{\"name\":\"integer\"}},{\"argument-name\":\"b\",\"type\":{\"name\":\"integer\"}}]",
      "level" => "hard",
      "name" => "mega_task",
      "output_signature" => "{\"type\":{\"name\":\"string\"}}",
      "tags" => " kek,lol"
    }

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> patch(Routes.task_path(conn, :update, task), task: params)

    assert %{id: id} = redirected_params(conn)
    assert redirected_to(conn) == Routes.task_path(conn, :edit, id)

    task = Codebattle.Task.get!(id)

    assert %{
             asserts: [
               %{arguments: [1, 1], expected: 2},
               %{arguments: [1, 1], expected: 2}
             ],
             description_en: "test sum: for ruby",
             description_ru: "проверка суммирования: для руби",
             examples: "```\n2 == solution(1,1)\n10 == solution(9,1)\n```",
             input_signature: [
               %{"argument-name" => "a", "type" => %{"name" => "integer"}},
               %{"argument-name" => "b", "type" => %{"name" => "integer"}}
             ],
             level: "hard",
             name: "mega_task",
             origin: "user",
             output_signature: %{"type" => %{"name" => "string"}},
             tags: ["kek", "lol"]
           } = task
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
end
