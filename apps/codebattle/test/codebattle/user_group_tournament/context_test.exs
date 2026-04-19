defmodule Codebattle.UserGroupTournament.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.GroupTournament
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserGroupTournament.Context

  setup do
    user =
      insert(:user,
        external_oauth_login: "ext-user"
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
end
