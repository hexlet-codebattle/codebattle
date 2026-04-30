defmodule CodebattleWeb.GroupTournamentControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.GroupTournament
  alias Codebattle.Repo
  alias Codebattle.UserGroupTournament

  defp insert_group_tournament(attrs) do
    base = %{
      creator_id: insert(:user).id,
      group_task_id: insert(:group_task).id,
      name: "My Tournament",
      slug: "my-tournament-#{System.unique_integer([:positive])}",
      description: "desc",
      starts_at: DateTime.add(DateTime.utc_now(), 3600, :second),
      rounds_count: 1,
      round_timeout_seconds: 60
    }

    %GroupTournament{}
    |> GroupTournament.changeset(Map.merge(base, attrs))
    |> Repo.insert!()
  end

  defp insert_user_group_tournament(user, group_tournament, overrides \\ %{}) do
    attrs =
      Map.merge(
        %{
          user_id: user.id,
          group_tournament_id: group_tournament.id,
          state: "pending",
          repo_state: "pending",
          role_state: "pending",
          secret_state: "pending",
          token: "token-#{System.unique_integer([:positive])}-abcdefghij"
        },
        overrides
      )

    %UserGroupTournament{}
    |> UserGroupTournament.changeset(attrs)
    |> Repo.insert!()
  end

  test "redirects guest to /", %{conn: conn} do
    conn = get(conn, "/my-tournament")

    assert redirected_to(conn) == "/"
  end

  test "redirects to / when user has no group tournament", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/my-tournament")

    assert redirected_to(conn) == "/"
  end

  test "redirects to group tournament page when latest is active", %{conn: conn} do
    user = insert(:user)

    group_tournament =
      insert_group_tournament(%{
        state: "active",
        started_at: DateTime.utc_now(:second),
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        current_round_position: 1,
        last_round_started_at: NaiveDateTime.utc_now(:second)
      })

    insert_user_group_tournament(user, group_tournament)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/my-tournament")

    assert redirected_to(conn) == "/group_tournaments/#{group_tournament.id}"
  end

  test "redirects to / when latest is finished", %{conn: conn} do
    user = insert(:user)

    group_tournament =
      insert_group_tournament(%{
        state: "finished",
        started_at: DateTime.utc_now(:second),
        finished_at: DateTime.utc_now(:second),
        starts_at: DateTime.add(DateTime.utc_now(), -120, :second)
      })

    insert_user_group_tournament(user, group_tournament)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/my-tournament")

    assert redirected_to(conn) == "/"
  end

  test "redirects to group tournament without starting when waiting and no start param", %{conn: conn} do
    user = insert(:user)
    group_tournament = insert_group_tournament(%{state: "waiting_participants"})
    insert_user_group_tournament(user, group_tournament)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/my-tournament")

    assert redirected_to(conn) == "/group_tournaments/#{group_tournament.id}"

    reloaded = Repo.get!(GroupTournament, group_tournament.id)
    assert reloaded.state == "waiting_participants"
  end

  test "starts tournament when ?start=true and external setup not required", %{conn: conn} do
    user = insert(:user)

    group_tournament =
      insert_group_tournament(%{state: "waiting_participants", run_on_external_platform: false})

    insert_user_group_tournament(user, group_tournament)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/my-tournament?start=true")

    assert redirected_to(conn) == "/group_tournaments/#{group_tournament.id}"

    reloaded = Repo.get!(GroupTournament, group_tournament.id)
    assert DateTime.before?(reloaded.starts_at, DateTime.add(DateTime.utc_now(), 60, :second))
  end

  test "starts tournament when ?start=true and external setup completed", %{conn: conn} do
    user = insert(:user)

    group_tournament =
      insert_group_tournament(%{
        state: "waiting_participants",
        run_on_external_platform: true,
        template_id: "template-id"
      })

    insert_user_group_tournament(user, group_tournament, %{
      state: "ready",
      repo_state: "completed",
      role_state: "completed",
      secret_state: "completed",
      repo_url: "https://ext.test/org/repo",
      role: "developer",
      secret_key: "CODEBATTLE_AUTH_TOKEN",
      secret_group: "ci"
    })

    original_starts_at = Repo.get!(GroupTournament, group_tournament.id).starts_at

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/my-tournament?start=true")

    assert redirected_to(conn) == "/group_tournaments/#{group_tournament.id}"

    reloaded = Repo.get!(GroupTournament, group_tournament.id)
    assert DateTime.before?(reloaded.starts_at, original_starts_at)
  end

  test "does not start tournament when ?start=true but external setup incomplete", %{conn: conn} do
    user = insert(:user)

    group_tournament =
      insert_group_tournament(%{
        state: "waiting_participants",
        run_on_external_platform: true,
        template_id: "template-id"
      })

    insert_user_group_tournament(user, group_tournament, %{
      state: "pending",
      repo_state: "completed",
      role_state: "pending",
      secret_state: "pending"
    })

    original_starts_at = Repo.get!(GroupTournament, group_tournament.id).starts_at

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/my-tournament?start=true")

    assert redirected_to(conn) == "/group_tournaments/#{group_tournament.id}"

    reloaded = Repo.get!(GroupTournament, group_tournament.id)
    assert reloaded.state == "waiting_participants"
    assert DateTime.compare(reloaded.starts_at, original_starts_at) == :eq
  end

  test "uses the latest user_group_tournament when user has multiple", %{conn: conn} do
    user = insert(:user)

    older = insert_group_tournament(%{state: "waiting_participants"})

    newer =
      insert_group_tournament(%{
        state: "active",
        started_at: DateTime.utc_now(:second),
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        current_round_position: 1,
        last_round_started_at: NaiveDateTime.utc_now(:second)
      })

    insert_user_group_tournament(user, older)
    Process.sleep(1100)
    insert_user_group_tournament(user, newer)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get("/my-tournament")

    assert redirected_to(conn) == "/group_tournaments/#{newer.id}"
  end
end
