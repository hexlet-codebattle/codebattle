defmodule Codebattle.UserGroupTournament.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.GroupTournament
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserGroupTournament.Context

  setup do
    original_adapter = Application.get_env(:codebattle, :external_platform_adapter)
    original_service_url = Application.get_env(:codebattle, :external_platform_service_url)
    original_auth_req_options = Application.get_env(:codebattle, :auth_req_options)

    on_exit(fn ->
      Application.put_env(:codebattle, :external_platform_adapter, original_adapter)
      Application.put_env(:codebattle, :external_platform_service_url, original_service_url)
      Application.put_env(:codebattle, :auth_req_options, original_auth_req_options)
    end)

    user =
      insert(:user,
        external_oauth_login: "ext-user",
        external_platform_id: "platform-user-id",
        external_platform_login: "ext-user"
      )

    repo_slug = "source-repo-#{user.id}"
    role_path = "/repos/test-org/#{repo_slug}/roles"
    secret_path = "/repos/test-org/#{repo_slug}/secrets/CODEBATTLE_AUTH_TOKEN"

    Req.Test.stub(Codebattle.Auth, fn req ->
      case req do
        %{request_path: "/v1/users/id", method: "GET", host: "ext.test"} ->
          Req.Test.json(req, %{"id" => "platform-user-id", "login" => "ext-user"})

        %{request_path: "/orgs/test-org/repos", method: "POST", host: "ext.test"} = req ->
          Req.Test.json(req, %{
            "status" => "created",
            "web_url" => "https://external.platform/test-org/#{repo_slug}"
          })

        %{request_path: ^role_path, method: "POST", host: "ext.test"} = req ->
          Req.Test.json(req, %{"subject_roles" => [%{"role" => "developer"}]})

        %{
          request_path: ^secret_path,
          method: "PUT",
          host: "ext.test"
        } = req ->
          Req.Test.json(req, %{"status" => "scheduled", "operation_id" => "secret-op-1"})
      end
    end)

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: insert(:user).id,
        group_task_id: insert(:group_task).id,
        name: "Source Repo Tournament",
        slug: "source-repo",
        description: "Tournament description",
        starts_at: DateTime.add(DateTime.utc_now(), 3600, :second),
        rounds_count: 1,
        round_timeout_seconds: 60,
        run_on_external_platform: true,
        template_id: "template-repo-id"
      })
      |> Repo.insert!()

    {:ok, %{user: user, group_tournament: group_tournament}}
  end

  test "ensure_external_setup provisions repo role and auth token secret", %{
    user: user,
    group_tournament: group_tournament
  } do
    assert {:ok, record} = Context.ensure_external_setup(user, group_tournament)

    assert record.state == "ready"
    assert record.repo_state == "completed"
    assert record.role_state == "completed"
    assert record.secret_state == "completed"
    assert record.repo_url == "https://fake-platform.test/test-org/source-repo-#{user.id}"
    assert Context.repo_slug_for(user, group_tournament) == "source-repo-#{user.id}"
    assert record.secret_key == "CODEBATTLE_AUTH_TOKEN"
    assert record.secret_group == "ci"

    token_record = Repo.get_by(UserGroupTournament, user_id: user.id, group_tournament_id: group_tournament.id)

    assert token_record
    assert is_binary(token_record.token)
    assert String.length(token_record.token) >= 16
  end

  test "occupy_user_seat calls external platform even when workplace state is completed", %{
    user: user,
    group_tournament: group_tournament
  } do
    insert_user_group_tournament(user, group_tournament, %{
      workplace_state: "completed",
      release_state: "completed"
    })

    Application.put_env(:codebattle, :external_platform_adapter, nil)
    Application.put_env(:codebattle, :external_platform_service_url, "https://ext.test")
    Application.put_env(:codebattle, :auth_req_options, plug: {Req.Test, Codebattle.Auth})

    test_pid = self()

    Req.Test.stub(Codebattle.Auth, fn conn ->
      {:ok, body, conn} = Plug.Conn.read_body(conn)
      send(test_pid, {:request, conn.method, conn.request_path, body})
      Req.Test.json(conn, %{"status" => "ok"})
    end)

    assert :ok = Context.occupy_user_seat(user.id, group_tournament.id)

    assert_receive {:request, "POST", "/code-assist-workplaces/occupy-bulk", ~s({"user_ids":["platform-user-id"]})}
  end

  test "release_user_seat calls external platform even when release state is completed", %{
    user: user,
    group_tournament: group_tournament
  } do
    insert_user_group_tournament(user, group_tournament, %{
      workplace_state: "completed",
      release_state: "completed"
    })

    Application.put_env(:codebattle, :external_platform_adapter, nil)
    Application.put_env(:codebattle, :external_platform_service_url, "https://ext.test")
    Application.put_env(:codebattle, :auth_req_options, plug: {Req.Test, Codebattle.Auth})

    test_pid = self()

    Req.Test.stub(Codebattle.Auth, fn conn ->
      {:ok, body, conn} = Plug.Conn.read_body(conn)
      send(test_pid, {:request, conn.method, conn.request_path, body})
      Req.Test.json(conn, %{"status" => "ok"})
    end)

    assert :ok = Context.release_user_seat(user.id, group_tournament.id)

    assert_receive {:request, "POST", "/code-assist-workplaces/release-bulk", ~s({"user_ids":["platform-user-id"]})}
  end

  defp insert_user_group_tournament(user, group_tournament, attrs) do
    %UserGroupTournament{}
    |> UserGroupTournament.changeset(
      Map.merge(
        %{
          user_id: user.id,
          group_tournament_id: group_tournament.id,
          state: "ready",
          repo_state: "completed",
          role_state: "completed",
          secret_state: "completed"
        },
        attrs
      )
    )
    |> Repo.insert!()
  end
end
