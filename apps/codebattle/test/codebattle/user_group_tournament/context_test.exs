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

  test "manages local records and tokens without provisioning" do
    tournament = insert(:group_tournament, run_on_external_platform: false)
    user = insert(:user)

    assert Context.get(user.id, tournament.id) == nil
    assert {:ok, record} = Context.ensure_external_setup(user, tournament)
    assert Context.get(user.id, tournament.id).id == record.id
    assert Context.get_latest_for_user(user.id).id == record.id
    assert Enum.map(Context.list_users(tournament.id), & &1.id) == [record.id]

    assert {:ok, token_record} = Context.get_or_create_token(tournament, user.id)
    assert is_binary(token_record.token)
    assert {:ok, same_record} = Context.get_or_create_token(tournament.id, user.id)
    assert same_record.token == token_record.token
    assert Context.get_token_by_value("  #{token_record.token}  ").id == record.id
    assert Context.get_token_by_value(nil) == nil

    assert {:ok, rotated} = Context.create_or_rotate_token(tournament, user.id)
    assert rotated.token != token_record.token
    assert Enum.map(Context.list_tokens(tournament, limit: 1), & &1.id) == [record.id]
  end

  test "creates token records directly and fills a missing token" do
    tournament = insert(:group_tournament)
    first = insert(:user)
    second = insert(:user)

    assert {:ok, created} = Context.create_or_rotate_token(tournament.id, first.id)
    assert is_binary(created.token)

    tokenless =
      insert_user_group_tournament(second, tournament, %{
        token: nil,
        workplace_state: "pending",
        release_state: "pending"
      })

    assert {:ok, filled} = Context.get_or_create_token(tournament.id, second.id)
    assert filled.id == tokenless.id
    assert is_binary(filled.token)
  end

  test "get_or_create returns an existing local record" do
    tournament = insert(:group_tournament, run_on_external_platform: false)
    user = insert(:user)
    existing = insert_user_group_tournament(user, tournament, %{})

    assert Context.get_or_create(user, tournament).id == existing.id
    assert Context.repo_slug_for(nil, tournament) == tournament.slug
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
